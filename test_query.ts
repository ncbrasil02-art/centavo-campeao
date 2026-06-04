import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data, error } = await supabase
    .from('auctions')
    .select(`
      *,
      product:products (
        id,
        name,
        images
      ),
      last_bidder:profiles (
        id,
        username,
        phone
      )
    `)
    .limit(5)
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Data count:', data.length)
    console.log('Sample item product:', data[0]?.product)
  }
}

test()
