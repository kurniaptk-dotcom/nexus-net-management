const https = require('https');
const req = https.request('https://nexus-net-management.vercel.app/', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    // Check if JS references new chunks
    console.log('Status:', res.statusCode);
    const hasBBw2V6CD = d.includes('BBw2V6CD');
    const hasBXlELVOI = d.includes('BXlELVOI');
    console.log('Has BBw2V6CD (old):', hasBBw2V6CD);
    console.log('Has BXlELVOI (new):', hasBXlELVOI);
    // Check if HTML has root div
    console.log('Has #root:', d.includes('id="root"'));
    console.log('Has script module:', d.includes('type="module"'));
    process.exit(0);
  });
});
req.on('error', e => { console.log('Error:', e.message); process.exit(1); });
req.end();
