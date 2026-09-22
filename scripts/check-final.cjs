const https = require('https');
const req = https.request('https://nexus-net-management.vercel.app/', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const m = d.match(/src="\/assets\/([^"]+\.js)"/);
    console.log('Main chunk:', m ? m[1] : 'NONE');
    
    // Also check if DEBUG div is in the HTML
    console.log('Has DEBUG div:', d.includes('DEBUG: HTML LOADED'));
    console.log('Has red style:', d.includes('background:red'));
    
    // Check if the main chunk loads
    if (m) {
      const chunkName = m[1];
      const req2 = https.request(`https://nexus-net-management.vercel.app/assets/${chunkName}`, (res2) => {
        let d2 = '';
        res2.on('data', c => d2 += c);
        res2.on('end', () => {
          console.log('Chunk size:', d2.length);
          console.log('Has __APP_STARTED:', d2.includes('__APP_STARTED__'));
          console.log('Has ff0000:', d2.includes('ff0000'));
          console.log('Has app_test:', d2.includes('app_test'));
          process.exit(0);
        });
      });
      req2.on('error', e => { console.log('Chunk Error:', e.message); process.exit(1); });
      req2.end();
    }
  });
});
req.on('error', e => { console.log('Error:', e.message); process.exit(1); });
req.end();
