const https = require('https');
const req = https.request('https://nexus-net-management.vercel.app/assets/supabase-DXm93gpy.js', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    // Check for createClient call
    const hasCreateClient = d.includes('createClient');
    const hasSupabaseUrl = d.includes('iyxekxcklmvfasbvcgyl');
    const hasAnonKey = d.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    const hasVITE = d.includes('VITE_SUPABASE');
    console.log('Has createClient:', hasCreateClient);
    console.log('Has Supabase URL:', hasSupabaseUrl);
    console.log('Has anon key:', hasAnonKey);
    console.log('Has VITE env var:', hasVITE);
    
    // Check for errors
    const hasErrorThrow = d.includes('throw') && d.includes('Error');
    console.log('Has error handling:', hasErrorThrow);
    
    // Find the supabase initialization
    const initMatch = d.match(/createClient\([^)]+\)/g);
    console.log('createClient calls:', initMatch ? initMatch.length : 0);
    if (initMatch) {
      initMatch.forEach(m => console.log('  -', m.substring(0, 200)));
    }
    
    // Show first 500 chars
    console.log('\nFirst 500 chars:', d.substring(0, 500));
    process.exit(0);
  });
});
req.on('error', e => { console.log('Error:', e.message); process.exit(1); });
req.end();
