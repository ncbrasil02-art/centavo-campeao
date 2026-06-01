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

    const payload = await req.json()
    console.log('Webhook received:', payload)

    // Mercado Pago Webhook Logic
    // For Payments API, the payload usually has 'type' or 'action'
    const type = payload.type || (payload.topic === 'payment' ? 'payment' : null)
    const paymentId = payload.data?.id || (type === 'payment' ? payload.id : null)
    
    if (type === 'payment' && paymentId) {
      // 1. Fetch MP Access Token from site_settings
      const { data: settings } = await supabaseClient
        .from('site_settings')
        .select('mercado_pago_access_token')
        .single()

      if (!settings?.mercado_pago_access_token) {
        throw new Error('MP Access Token not found')
      }

      // 2. Fetch payment details from Mercado Pago
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${settings.mercado_pago_access_token}`,
        }
      })

      if (!mpResponse.ok) {
        throw new Error(`Failed to fetch payment ${paymentId} from MP`)
      }

      const payment = await mpResponse.json()
      const externalReference = payment.external_reference
      const status = payment.status

      console.log(`Payment ${paymentId} status: ${status}, external_reference: ${externalReference}`)
      
      if (externalReference && status === 'approved') {
        console.log(`Finalizing transaction: ${externalReference}`)
        
        const { data, error } = await supabaseClient.rpc('complete_payment', {
          p_transaction_id: externalReference,
          p_external_id: paymentId.toString()
        })

        if (error) {
          console.error('Error completing payment:', error)
          return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        console.log('Payment completed successfully:', data)
      } else if (externalReference && (status === 'cancelled' || status === 'rejected')) {
        await supabaseClient
          .from('transactions')
          .update({ status: 'failed' })
          .eq('id', externalReference)
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
