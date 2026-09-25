const fs = require('fs');
const XLSX = require('xlsx');

function excelDateToJS(serial) {
  if (!serial) return '';
  if (typeof serial === 'string') return serial.trim();
  if (typeof serial === 'number') {
    const utc_days = Math.floor(serial - 25569);
    const date_info = new Date(utc_days * 86400 * 1000);
    const y = date_info.getUTCFullYear();
    const m = String(date_info.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date_info.getUTCDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  return String(serial);
}

const wb = XLSX.readFile('spreadsheet_real.xlsx');

// Let's examine GATRA AIS, AZWAR RIO, IQBAL JUSMAN
const teamSheets = [
  { sheetName: 'GATRA AIS', teamName: 'GATRA - AIS' },
  { sheetName: 'AZWAR RIO', teamName: 'AZWAR - RIO' },
  { sheetName: 'IQBAL JUSMAN', teamName: 'IQBAL - JUSMAN' }
];

console.log('=== PARSING DATA ===');
for (const t of teamSheets) {
  const ws = wb.Sheets[t.sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log('Team:', t.teamName, 'Total rows in sheet:', rows.length);
  
  // Inspect rows starting from row 4 or 5
  let pemasanganCount = 0;
  let perbaikanCount = 0;
  let pemutusanCount = 0;

  for (let r = 4; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    // Pemasangan: col 1 has nama
    if (row[1] && typeof row[1] === 'string' && row[1].trim() && !row[1].includes('TOTAL') && !row[1].includes('Kinerja') && isNaN(Number(row[1]))) {
      pemasanganCount++;
    }
    // Perbaikan: col 17 has nama
    if (row[17] && typeof row[17] === 'string' && row[17].trim() && !row[17].includes('TOTAL') && isNaN(Number(row[17]))) {
      perbaikanCount++;
    }
    // Pemutusan: col 33 has nama
    if (row[33] && typeof row[33] === 'string' && row[33].trim() && !row[33].includes('TOTAL') && isNaN(Number(row[33]))) {
      pemutusanCount++;
    }
  }
  console.log(`  Pemasangan: ${pemasanganCount}, Perbaikan: ${perbaikanCount}, Pemutusan: ${pemutusanCount}`);
}
