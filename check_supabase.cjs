const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://tbtnwzvzwdfrejohqptq.supabase.co', 'sb_publishable_k8O70KbCY_2Lo7Z-4yi0LA_e0q3IqeM');

async function check() {
  const { data, error } = await supabase.from('reports').select('*').limit(1);
  console.log('Error:', error);
  console.log('Data:', data);
}

check();
