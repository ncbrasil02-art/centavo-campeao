import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  console.log('Auction worker started')
  const startTime = Date.now()
  const maxDuration = 55 * 1000 // 55 seconds
  let ticks = 0

  try {
    while (Date.now() - startTime < maxDuration) {
      const { data, error } = await supabase.rpc('tick_auctions')
      
      if (error) {
        console.error('Error ticking auctions:', error)
      } else {
        ticks++
        // Log every 10 ticks to avoid log spam
        if (ticks % 10 === 0) {
          console.log(`Worker tick #${ticks}:`, data)
        }
      }

      // Wait 500ms between ticks for better precision in final seconds
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    console.log(`Auction worker finished after ${ticks} ticks`)
    return new Response(JSON.stringify({ success: true, ticks }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error('Unexpected error in auction worker:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
