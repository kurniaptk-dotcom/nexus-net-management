const https = require('https');
// Check the main chunk for env vars
const req = https.request('https://nexus-net-management.vercel.app/assets/index-CbiYOO90.js', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('Size:', d.length);
    console.log('Has iyxekxcklmvfasbvcgyl:', d.includes('iyxekxcklmvfasbvcgyl'));
    console.log('Has VITE_SUPABASE_URL:', d.includes('VITE_SUPABASE_URL'));
    console.log('Has eyJhbGci:', d.includes('eyJhbGci'));
    console.log('Has undefined:', d.includes('"undefined"') || d.includes("'undefined'"));
    // Find createClient calls in main chunk
    const matches = d.match(/createClient\([^)]*\)/g);
    console.log('createClient calls:', matches ? matches.length : 0);
    if (matches) matches.forEach(m => console.log('  -', m.substring(0, 200)));
    process.exit(0);
  });
});
req.on('error', e => { console.log('Error:', e.message); process.exit(1); });
req.end();
