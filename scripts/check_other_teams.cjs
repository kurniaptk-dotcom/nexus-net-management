const XLSX = require('xlsx');
const wb = XLSX.readFile('spreadsheet_real.xlsx');

for (const name of ['AZWAR RIO', 'IQBAL JUSMAN']) {
  console.log(`=== ${name} ===`);
  const ws = wb.Sheets[name];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log('Row 2:');
  raw[2].forEach((v, i) => { if (v !== null && v !== undefined) console.log(`  col ${i}: ${v}`); });
  console.log('Row 3:');
  raw[3].forEach((v, i) => { if (v !== null && v !== undefined) console.log(`  col ${i}: ${v}`); });
  console.log('Row 5:');
  raw[5].forEach((v, i) => { if (v !== null && v !== undefined) console.log(`  col ${i}: ${v}`); });
}
