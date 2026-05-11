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

    const { package_id, transaction_id } = await req.json()

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

    // 3. Create Mercado Pago Preference
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.mercado_pago_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            title: pkg.name,
            unit_price: pkg.price,
            quantity: 1,
            currency_id: 'BRL',
          }
        ],
        external_reference: transaction_id,
        back_urls: {
          success: `${req.headers.get('origin')}/packages?status=success`,
          failure: `${req.headers.get('origin')}/packages?status=failure`,
          pending: `${req.headers.get('origin')}/packages?status=pending`,
        },
        auto_return: 'approved',
        notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-webhook`,
      }),
    })

    const preference = await response.json()

    if (!response.ok) {
      console.error('MP Error:', preference)
      return new Response(JSON.stringify({ error: 'Erro ao criar preferência no Mercado Pago.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ checkout_url: preference.init_point }), {
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
