const https = require('https');
const req = https.request('https://nexus-net-management.vercel.app/', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const m = d.match(/src="\/assets\/([^"]+\.js)"/);
    if (!m) { console.log('No chunk found'); process.exit(0); }
    const chunkName = m[1];
    const req2 = https.request(`https://nexus-net-management.vercel.app/assets/${chunkName}`, (res2) => {
      let d2 = '';
      res2.on('data', c => d2 += c);
      res2.on('end', () => {
        console.log('Chunk:', chunkName, 'Size:', d2.length);
        console.log('Has ERROR:', d2.includes('ERROR:'));
        console.log('Has __APP_STARTED:', d2.includes('__APP_STARTED__'));
        console.log('Has ff0000:', d2.includes('ff0000'));
        // Find the catch block
        const catchIdx = d2.indexOf('catch');
        if (catchIdx > 0) {
          console.log('Has catch:', d2.substring(Math.max(0, catchIdx-20), catchIdx+50));
        }
        process.exit(0);
      });
    });
    req2.on('error', e => { console.log('Error:', e.message); process.exit(1); });
    req2.end();
  });
});
req.on('error', e => { console.log('Error:', e.message); process.exit(1); });
req.end();
