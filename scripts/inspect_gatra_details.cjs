const fs = require('fs');
const XLSX = require('xlsx');

const wb = XLSX.readFile('spreadsheet_real.xlsx');
const ws = wb.Sheets['GATRA AIS'];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log('Row 2 (Header labels):');
raw[2].forEach((val, idx) => {
  if (val !== undefined && val !== null) console.log(`  col ${idx}: ${val}`);
});
console.log('Row 3 (Sub-headers):');
raw[3].forEach((val, idx) => {
  if (val !== undefined && val !== null) console.log(`  col ${idx}: ${val}`);
});

console.log('\nRows 5 to 10:');
for (let r = 5; r <= 10; r++) {
  const row = raw[r];
  console.log(`--- Row ${r} ---`);
  row.forEach((val, idx) => {
    if (val !== undefined && val !== null) console.log(`    col ${idx}: ${val}`);
  });
}
