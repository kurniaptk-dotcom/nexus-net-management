const https = require('https');
const req = https.request('https://nexus-net-management.vercel.app/assets/supabase-DXm93gpy.js', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    // Find the createClient call and check what values are passed
    const createClientMatches = d.match(/createClient\([^)]+\)/g);
    console.log('createClient calls:', createClientMatches ? createClientMatches.length : 0);
    if (createClientMatches) {
      createClientMatches.forEach(m => console.log('  -', m.substring(0, 300)));
    }
    
    // Check for undefined values
    const hasUndefined = d.includes('undefined') || d.includes('void 0');
    console.log('Has undefined:', hasUndefined);
    
    // Find URL-like strings
    const urlMatches = d.match(/https?:\/\/[^"'\s)]+/g);
    console.log('URL strings found:', urlMatches ? urlMatches.length : 0);
    if (urlMatches) urlMatches.forEach(u => console.log('  -', u.substring(0, 100)));
    
    // Find key-like strings (JWT tokens)
    const keyMatches = d.match(/eyJ[A-Za-z0-9_-]+\./g);
    console.log('JWT keys found:', keyMatches ? keyMatches.length : 0);
    
    // Show around the createClient call
    const ccIdx = d.indexOf('createClient');
    if (ccIdx > 0) {
      console.log('\nAround createClient:', d.substring(Math.max(0, ccIdx-50), ccIdx+100));
    }
    
    process.exit(0);
  });
});
req.on('error', e => { console.log('Error:', e.message); process.exit(1); });
req.end();
