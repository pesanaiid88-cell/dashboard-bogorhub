import { createClient } from '@supabase/supabase-js'

const url = "https://tbtnwzvzwdfrejohqptq.supabase.co"
const key = "sb_publishable_k8O70KbCY_2Lo7Z-4yi0LA_e0q3IqeM"

const supabase = createClient(url, key)

async function test() {
  console.log("--- REPORTS ---")
  const { data: reports, error: err1 } = await supabase.from('reports').select('*').limit(5)
  console.log(err1 || reports)

  console.log("--- CITIZENS ---")
  const { data: citizens, error: err2 } = await supabase.from('citizens').select('*').limit(5)
  console.log(err2 || citizens)

  console.log("--- SERVICES ---")
  const { data: services, error: err3 } = await supabase.from('services').select('*').limit(5)
  console.log(err3 || services)

  console.log("--- SERVICE REQUESTS ---")
  const { data: requests, error: err4 } = await supabase.from('service_requests').select('*').limit(5)
  console.log(err4 || requests)

  console.log("--- REPORT CATEGORIES ---")
  const { data: categories, error: err5 } = await supabase.from('report_categories').select('*').limit(5)
  console.log(err5 || categories)
}

test()
