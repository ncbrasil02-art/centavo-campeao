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

    // Mercado Pago Webhook Logic (Example)
    // Most MP webhooks are for 'payment' topic
    if (payload.action === 'payment.created' || payload.type === 'payment') {
      const paymentId = payload.data?.id || payload.id
      
      // Fetch payment details from Mercado Pago if needed
      // For this simulation, we'll assume the external_reference is our transaction_id
      const externalReference = payload.external_reference || payload.data?.external_reference
      
      if (externalReference) {
        console.log(`Finalizing transaction: ${externalReference}`)
        
        const { data, error } = await supabaseClient.rpc('complete_payment', {
          p_transaction_id: externalReference,
          p_external_id: `MP-${paymentId}`
        })

        if (error) {
          console.error('Error completing payment:', error)
          return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        console.log('Payment completed successfully:', data)
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
