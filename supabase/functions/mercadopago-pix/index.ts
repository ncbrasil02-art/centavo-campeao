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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { package_id } = await req.json()

    // 1. Fetch MP Access Token from site_settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('site_settings')
      .select('mercado_pago_access_token')
      .single()

    if (settingsError || !settings?.mercado_pago_access_token) {
      return new Response(JSON.stringify({ error: 'Configuração do Mercado Pago não encontrada.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Fetch package details
    const { data: pkg, error: pkgError } = await supabaseClient
      .from('bid_packages')
      .select('*')
      .eq('id', package_id)
      .single()

    if (pkgError || !pkg) {
      return new Response(JSON.stringify({ error: 'Pacote não encontrado.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Create pending transaction via RPC
    const { data: transaction, error: transError } = await supabaseClient.rpc('create_pending_payment', {
      p_package_id: package_id,
      p_method: 'pix'
    })

    if (transError || !transaction?.success) {
      return new Response(JSON.stringify({ error: 'Erro ao criar transação pendente.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const transaction_id = transaction.transaction_id

    // 4. Create Mercado Pago Payment (PIX)
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.mercado_pago_access_token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': transaction_id,
      },
      body: JSON.stringify({
        transaction_amount: pkg.price,
        description: `Compra de ${pkg.bid_amount} lances - ${pkg.name}`,
        payment_method_id: 'pix',
        payer: {
          email: user.email,
          first_name: user.user_metadata?.full_name?.split(' ')[0] || 'Cliente',
          last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || 'Leilão',
        },
        external_reference: transaction_id,
        notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`,
      }),
    })

    const payment = await mpResponse.json()

    if (!mpResponse.ok) {
      console.error('MP Error:', payment)
      return new Response(JSON.stringify({ error: 'Erro ao gerar PIX no Mercado Pago.', details: payment }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const pix_copy_paste = payment.point_of_interaction.transaction_data.qr_code
    const pix_qr_code = payment.point_of_interaction.transaction_data.qr_code_base64
    const external_id = payment.id.toString()

    // 5. Update transaction with MP details
    await supabaseClient
      .from('transactions')
      .update({
        external_id: external_id,
        pix_copy_paste: pix_copy_paste,
        pix_qr_code: pix_qr_code
      })
      .eq('id', transaction_id)

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
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
