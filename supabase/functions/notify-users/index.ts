import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { auction_id, time_before, channel, message } = await req.json()

    // 1. Verify that the requester is an admin
    const authHeader = req.headers.get('Authorization')
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader?.replace('Bearer ', ''))
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }


    // Fetch auction details
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('*, product:products(*)')
      .eq('id', auction_id)
      .single()

    if (auctionError) throw auctionError

    // Fetch all users (profiles)
    // We only fetch profiles that are not bots
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, phone, full_name')
      .eq('is_bot', false)

    if (profilesError) throw profilesError

    console.log(`Notifying ${profiles.length} users via ${channel} for auction ${auction_id}`)

    // Here you would integrate with your preferred Email provider (e.g. Resend, SendGrid)
    // Or WhatsApp API provider (e.g. Twilio, Evolution API)
    
    // For now, we will simulate the sending and log it
    // In a real scenario, you'd loop through profiles and send messages
    
    /*
    for (const profile of profiles) {
      if (channel === 'email') {
        // Send email...
      } else if (channel === 'whatsapp') {
        // Send WhatsApp...
      }
    }
    */

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notificação processada para ${profiles.length} usuários via ${channel}.`,
        userCount: profiles.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
