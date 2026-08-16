const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://tbtnwzvzwdfrejohqptq.supabase.co', 'sb_publishable_k8O70KbCY_2Lo7Z-4yi0LA_e0q3IqeM');

async function check() {
  const { data, error } = await supabase.from('reports').select('*');
  console.log('Error:', error);
  console.log('Media URLs:', data.map(r => r.media_url).filter(Boolean));
  console.log('Other keys with URLs:', data.filter(r => Object.values(r).some(v => typeof v === 'string' && v.startsWith('http'))).map(r => r.id));
}

check();
