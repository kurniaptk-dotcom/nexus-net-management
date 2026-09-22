const https = require('https');
const req = https.request('https://nexus-net-management.vercel.app/', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('Content length:', d.length);
    // Find script tags
    const scriptMatches = d.match(/<script[^>]*src="([^"]*)"[^>]*>/g);
    console.log('Script tags found:', scriptMatches ? scriptMatches.length : 0);
    if (scriptMatches) {
      scriptMatches.forEach(s => console.log('  -', s.substring(0, 120)));
    }
    // Find asset references
    const assetMatches = d.match(/\/assets\/[^"'\s]+/g);
    console.log('Asset references:', assetMatches ? [...new Set(assetMatches)] : 'none');
    process.exit(0);
  });
});
req.on('error', e => { console.log('Error:', e.message); process.exit(1); });
req.end();
