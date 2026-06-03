import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the current user
    const authHeader = req.headers.get('Authorization')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader?.replace('Bearer ', ''))
    
    if (userError || !user) {
      console.error('Auth error:', userError)
      return new Response(JSON.stringify({ error: 'Usuário não autenticado.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const { package_id } = body

    if (!package_id) {
      return new Response(JSON.stringify({ error: 'ID do pacote não fornecido.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 1. Fetch MP Access Token from admin_settings
    const { data: adminSettings, error: adminError } = await supabaseClient
      .from('admin_settings')
      .select('mercado_pago_access_token')
      .maybeSingle()
    
    if (adminError || !adminSettings?.mercado_pago_access_token) {
      console.error('Admin settings error:', adminError)
      return new Response(JSON.stringify({ error: 'Configuração do Mercado Pago (Access Token) não encontrada.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Fetch package details
    const { data: pkg, error: pkgError } = await supabaseClient
      .from('bid_packages')
      .select('*')
      .eq('id', package_id)
      .single()

    if (pkgError || !pkg) {
      console.error('Package error:', pkgError)
      return new Response(JSON.stringify({ error: 'Pacote de lances não encontrado.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Create pending transaction via RPC
    const { data: transaction, error: transError } = await supabaseClient.rpc('create_pending_payment', {
      p_package_id: package_id,
      p_method: 'pix',
      p_user_id: user.id
    })

    if (transError || !transaction?.success) {
      console.error('RPC Error:', transError, transaction)
      return new Response(JSON.stringify({ error: 'Erro ao registrar transação no banco de dados.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const transaction_id = transaction.transaction_id
    console.log(`Iniciando pagamento MP para transação ${transaction_id}, valor: ${pkg.price}`)

    // 4. Create Mercado Pago Payment (PIX)
    const mpPayload = {
      transaction_amount: Number(pkg.price),
      description: `Compra de ${pkg.bid_amount} lances - ${pkg.name}`,
      payment_method_id: 'pix',
      payer: {
        email: user.email,
        first_name: user.user_metadata?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Cliente',
        last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || 'Leilão',
      },
      external_reference: transaction_id,
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`,
    }

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminSettings.mercado_pago_access_token.trim()}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': transaction_id,
      },
      body: JSON.stringify(mpPayload),
    })

    const payment = await mpResponse.json()

    if (!mpResponse.ok) {
      console.error('Mercado Pago API Error:', JSON.stringify(payment, null, 2))
      return new Response(JSON.stringify({ 
        error: 'O Mercado Pago recusou a criação do PIX.', 
        details: payment.message || payment.cause?.[0]?.description || 'Erro desconhecido no MP'
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const pix_copy_paste = payment.point_of_interaction?.transaction_data?.qr_code
    const pix_qr_code = payment.point_of_interaction?.transaction_data?.qr_code_base64
    const external_id = payment.id?.toString()

    if (!pix_copy_paste) {
      console.error('PIX data missing in MP response:', payment)
      return new Response(JSON.stringify({ error: 'O Mercado Pago não retornou os dados do PIX.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 5. Update transaction with MP details
    const { error: updateError } = await supabaseClient
      .from('transactions')
      .update({
        external_id: external_id,
        pix_copy_paste: pix_copy_paste,
        pix_qr_code: pix_qr_code
      })
      .eq('id', transaction_id)

    if (updateError) {
      console.error('Error updating transaction with MP details:', updateError)
    }

    return new Response(JSON.stringify({ 
      transaction_id: transaction_id,
      pix_copy_paste: pix_copy_paste,
      pix_qr_code: pix_qr_code,
      status: payment.status
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Global Function Error:', error)
    return new Response(JSON.stringify({ error: 'Ocorreu um erro interno ao processar o pagamento.', details: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
