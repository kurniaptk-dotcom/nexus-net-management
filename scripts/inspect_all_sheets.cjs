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

// 1. Inspect Daftar Gangguan
const dgWs = wb.Sheets['Daftar Gangguan '];
const dgRows = XLSX.utils.sheet_to_json(dgWs);
console.log('Daftar Gangguan count:', dgRows.length);
console.log('Daftar Gangguan sample 1:', dgRows[0]);

// 2. Inspect ODP LOS
const odpWs = wb.Sheets['ODP LOS'];
const odpRaw = XLSX.utils.sheet_to_json(odpWs, { header: 1 });
console.log('ODP LOS headers row 2:', odpRaw[2]);
console.log('ODP LOS rows 5 to 10:', odpRaw.slice(5, 11));

// 3. Inspect FU Pelanggan Redaman Tinggi
const fuWs = wb.Sheets['FU Pelanggan Redaman Tinggi'];
const fuRaw = XLSX.utils.sheet_to_json(fuWs, { header: 1 });
console.log('FU Redaman sample rows:', fuRaw.slice(0, 10));

// 4. Inspect PENGAJUAN PEMUTUSAN
const putusWs = wb.Sheets['PENGAJUAN PEMUTUSAN '];
const putusRows = XLSX.utils.sheet_to_json(putusWs);
console.log('Pengajuan Pemutusan count:', putusRows.length);
console.log('Pengajuan Pemutusan sample:', putusRows[0]);
