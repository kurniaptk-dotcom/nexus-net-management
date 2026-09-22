const https = require('https');
// Check if the JS bundle loads correctly
const req = https.request('https://nexus-net-management.vercel.app/assets/index-BXlELVOI.js', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('JS Status:', res.statusCode);
    console.log('JS Size:', d.length);
    console.log('Has "usePersistState":', d.includes('usePersistState'));
    console.log('Has "Dashboard":', d.includes('Dashboard'));
    console.log('First 200 chars:', d.substring(0, 200));
    
    // Also check if CSS loads
    const req2 = https.request('https://nexus-net-management.vercel.app/assets/index-COedOZmS.css', (res2) => {
      let d2 = '';
      res2.on('data', c => d2 += c);
      res2.on('end', () => {
        console.log('\nCSS Status:', res2.statusCode);
        console.log('CSS Size:', d2.length);
        process.exit(0);
      });
    });
    req2.on('error', e => { console.log('CSS Error:', e.message); process.exit(1); });
    req2.end();
  });
});
req.on('error', e => { console.log('JS Error:', e.message); process.exit(1); });
req.end();
