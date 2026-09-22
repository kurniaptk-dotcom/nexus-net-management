const https = require('https');
// Check Vercel env by looking at the JS bundle for env vars
const req = https.request('https://nexus-net-management.vercel.app/assets/index-BXlELVOI.js', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    // Check if env vars are hardcoded or undefined
    const hasVITE_SUPABASE_URL = d.includes('VITE_SUPABASE_URL');
    const hasEmptyUrl = d.includes('undefined');
    const hasSupabaseCreateClient = d.includes('createClient');
    console.log('Has VITE_SUPABASE_URL reference:', hasVITE_SUPABASE_URL);
    console.log('Has undefined string:', hasEmptyUrl);
    console.log('Has createClient:', hasSupabaseCreateClient);
    
    // Check if it contains the actual URL
    const hasActualUrl = d.includes('iyxekxcklmvfasbvcgyl.supabase.co');
    console.log('Has actual Supabase URL:', hasActualUrl);
    
    // Find the env var section
    const envMatch = d.match(/VITE_SUPABASE_[A-Z_]+/g);
    console.log('Env var names found:', envMatch ? [...new Set(envMatch)] : 'none');
    
    process.exit(0);
  });
});
req.on('error', e => { console.log('Error:', e.message); process.exit(1); });
req.end();
