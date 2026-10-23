const https = require('https');
const fs = require('fs');
const path = require('path');

const filesToDownload = [
  { month: '01_januari', name: 'TIM WIFI JANUARI 2026', id: '14R9p1KNugmx52Gs3vZPD6qVWP57tuwAgK_sSFdevonI' },
  { month: '02_februari', name: 'TIM WIFI FEBRUARI 2026', id: '1kGO1W1R47hTwbepCzkBCx9NYGemOIe1OVfIPKq3b7Cw' },
  { month: '03_maret', name: 'TIM WIFI MARET 2026', id: '1-wVGvygEWmFLitG2_y3mFgnNXNoE2jrlKyG6knqm3Y4' },
  { month: '04_april', name: 'TIM WIFI APRIL 2026', id: '1q1ls2kgX7wXjmzBHylm4QDPQeiodXZVbuRSqyesmj1Y' },
  { month: '05_mei', name: 'TIM WIFI MEI 2026', id: '14mkt1ZFdDoT66tY6w6Tux54tiXMUpBh0zRXOR-DXHbA' },
  { month: '06_juni', name: 'TIM WIFI JUNI 2026', id: '1ncRYvPDpcm3s_gsBRxq6KmaHg3HJqEq9XCjLjnLs_94' },
  { month: '07_juli', name: 'TIM WIFI JULI 2026', id: '1lBQ6snRfw9SHReW-mLd3sfJGxDrxVk4gFwEH4APTd0o' },
  { month: '08_agustus', name: 'TIM WIFI AGUSTUS 2026', id: '15M-GDUF_LrxsD5PhbY0Uf4Rjya_ghr-F2LgJzIKSNpA' },
  { month: '09_september', name: 'TIM WIFI SEPTEMBER 2026', id: '1suterEVWZh7Y3NZs0-Nns2QBXZapAm6cYr8eQuyeGTA' },
  { month: '10_oktober', name: 'TIM WIFI OKTOBER 2026', id: '1DHAfCOFXcjB7n7yX9GW0xVFGA63kus4zrMAgV76xhUA' },
];

const targetDir = path.join(__dirname, '..', 'data_bulanan_2026');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function downloadFile(fileInfo) {
  return new Promise((resolve, reject) => {
    const filePath = path.join(targetDir, `${fileInfo.month}_${fileInfo.name.replace(/\s+/g, '_')}.xlsx`);
    const initialUrl = `https://docs.google.com/spreadsheets/d/${fileInfo.id}/export?format=xlsx`;

    function fetchUrl(currentUrl, hops = 0) {
      if (hops > 5) {
        return reject(new Error(`Too many redirects for ${fileInfo.name}`));
      }

      https.get(currentUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchUrl(res.headers.location, hops + 1);
        } else if (res.statusCode === 200) {
          const fileStream = fs.createWriteStream(filePath);
          res.pipe(fileStream);
          fileStream.on('finish', () => {
            fileStream.close();
            const stats = fs.statSync(filePath);
            console.log(`[SUCCESS] Downloaded ${fileInfo.name} -> ${filePath} (${(stats.size / 1024).toFixed(1)} KB)`);
            resolve(filePath);
          });
          fileStream.on('error', (err) => {
            fs.unlink(filePath, () => {});
            reject(err);
          });
        } else {
          reject(new Error(`HTTP ${res.statusCode} when downloading ${fileInfo.name}`));
        }
      }).on('error', reject);
    }

    console.log(`[START] Downloading ${fileInfo.name}...`);
    fetchUrl(initialUrl);
  });
}

async function run() {
  console.log(`Starting download of ${filesToDownload.length} monthly spreadsheets into ${targetDir}...`);
  for (const file of filesToDownload) {
    try {
      await downloadFile(file);
    } catch (err) {
      console.error(`[ERROR] Failed to download ${file.name}:`, err.message);
    }
  }
  console.log('All downloads completed!');
}

run();
