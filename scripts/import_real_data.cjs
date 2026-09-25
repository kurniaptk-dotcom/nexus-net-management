const fs = require('fs');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const url = 'https://iyxekxcklmvfasbvcgyl.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5eGVreGNrbG12ZmFzYnZjZ3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNjE1MDYsImV4cCI6MjEwNTYzNzUwNn0.yWRSbNfArKGKULZztkUSRSjQv5Cf7oEcL_4QIZO4h0o';
const client = createClient(url, key);

function excelDateToJS(serial) {
  if (!serial) return null;
  if (typeof serial === 'string') {
    const s = serial.trim();
    if (!s) return null;
    // If string like 27-7-26
    const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (m) {
      const day = String(m[1]).padStart(2, '0');
      const mon = String(m[2]).padStart(2, '0');
      let year = Number(m[3]);
      if (year < 100) year += 2000;
      return `${year}-${mon}-${day}`;
    }
    return s;
  }
  if (typeof serial === 'number') {
    // If small number, ignore
    if (serial < 1000) return null;
    const utc_days = Math.floor(serial - 25569);
    const date_info = new Date(utc_days * 86400 * 1000);
    const y = date_info.getUTCFullYear();
    const m = String(date_info.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date_info.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

const wb = XLSX.readFile('spreadsheet_real.xlsx');

async function run() {
  console.log('=== STARTING REAL DATA IMPORT ===');

  console.log('Clearing existing data from tables...');
  await client.from('pekerjaan').delete().neq('id', 0);
  await client.from('leads').delete().neq('id', 0);
  await client.from('daftar_gangguan').delete().neq('id', 0);
  await client.from('gangguan').delete().neq('id', 0);
  await client.from('odp_odc').delete().neq('id', 0);
  await client.from('pengajuan_pemutusan').delete().neq('id', 0);
  await client.from('tim').delete().neq('id', 0);

  // 1. TIM
  const timRows = [
    { nama: 'GATRA - AIS' },
    { nama: 'AZWAR - RIO' },
    { nama: 'IQBAL - JUSMAN' }
  ];
  console.log(`Inserting ${timRows.length} teams...`);
  const { data: insertedTim, error: errTim } = await client.from('tim').insert(timRows).select();
  if (errTim) console.error('Error inserting tim:', errTim.message);
  else console.log('Successfully inserted tim:', insertedTim.length);

  // 2. PEKERJAAN & LEADS FROM TEAM SHEETS
  const pekerjaanRows = [];
  const leadsRows = [];

  const teamConfigs = [
    {
      sheet: 'GATRA AIS',
      tim: 'GATRA - AIS',
      pemasangan: { nama: 1, lokasi: 2, start: 3, finish: 4, ket: 5, waiting: 6, jadwal: 7, selesai: 8, gagal: 9, iklan: 11, affiliate: 12, marketing: 13 },
      perbaikan: { nama: 17, start: 18, finish: 19, ket: 20, waiting: 22, jadwal: 23, selesai: 24 },
      pemutusan: { nama: 33, start: 34, finish: 35, ket: 36, waiting: 38, jadwal: 39, selesai: 40 }
    },
    {
      sheet: 'AZWAR RIO',
      tim: 'AZWAR - RIO',
      pemasangan: { nama: 1, lokasi: 2, start: 3, finish: 4, ket: 5, waiting: 6, jadwal: 7, selesai: 8, gagal: 9, iklan: 11, affiliate: 12, marketing: 13 },
      perbaikan: { nama: 17, start: 18, finish: 19, ket: 20, waiting: 22, jadwal: 23, selesai: 24 },
      pemutusan: { nama: 33, start: 34, finish: 35, ket: 36, waiting: 38, jadwal: 39, selesai: 40 }
    },
    {
      sheet: 'IQBAL JUSMAN',
      tim: 'IQBAL - JUSMAN',
      pemasangan: { nama: 1, lokasi: 2, start: 3, finish: 4, ket: 5, waiting: 6, jadwal: 7, selesai: 8, gagal: 9, iklan: 11, affiliate: 12, marketing: 13 },
      perbaikan: { nama: 17, start: 18, finish: 19, ket: 20, waiting: 21, jadwal: 22, selesai: 23 },
      pemutusan: { nama: 32, start: 33, finish: 34, ket: 35, waiting: 37, jadwal: 38, selesai: 39 }
    }
  ];

  for (const cfg of teamConfigs) {
    const ws = wb.Sheets[cfg.sheet];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });

    for (let r = 4; r < raw.length; r++) {
      const row = raw[r];
      if (!row) continue;

      // --- PEMASANGAN ---
      const pNama = row[cfg.pemasangan.nama];
      if (pNama && typeof pNama === 'string' && pNama.trim() && !pNama.toUpperCase().includes('TOTAL') && !pNama.toUpperCase().includes('KINERJA') && isNaN(Number(pNama))) {
        const tgl = excelDateToJS(row[cfg.pemasangan.start]) || excelDateToJS(row[cfg.pemasangan.finish]) || '2026-09-01';
        let status = 'WAITING LIST';
        if (Number(row[cfg.pemasangan.selesai]) === 1) status = 'SELESAI';
        else if (Number(row[cfg.pemasangan.jadwal]) === 1) status = 'DIJADWALKAN';
        else if (Number(row[cfg.pemasangan.gagal]) === 1) status = 'GAGAL';
        else if (excelDateToJS(row[cfg.pemasangan.finish])) status = 'SELESAI';

        pekerjaanRows.push({
          tim: cfg.tim,
          jenis: 'PEMASANGAN',
          pelanggan: pNama.trim(),
          alamat: row[cfg.pemasangan.lokasi] ? String(row[cfg.pemasangan.lokasi]).trim() : null,
          tanggal: tgl,
          status: status,
          keterangan: row[cfg.pemasangan.ket] ? String(row[cfg.pemasangan.ket]).trim() : null
        });

        // Leads mapping
        let sumber = 'IKLAN';
        if (Number(row[cfg.pemasangan.affiliate]) === 1) sumber = 'AFFILIATE';
        else if (Number(row[cfg.pemasangan.marketing]) === 1) sumber = 'MARKETING';

        let leadStatus = 'BARU';
        if (status === 'SELESAI') leadStatus = 'SELESAI';
        else if (status === 'DIJADWALKAN') leadStatus = 'DIJADWALKAN';
        else if (status === 'WAITING LIST') leadStatus = 'KONTAK';

        leadsRows.push({
          nama: pNama.trim(),
          sumber: sumber,
          status: leadStatus,
          tanggal: tgl,
          alamat: row[cfg.pemasangan.lokasi] ? String(row[cfg.pemasangan.lokasi]).trim() : null
        });
      }

      // --- PERBAIKAN ---
      const perNama = row[cfg.perbaikan.nama];
      if (perNama && typeof perNama === 'string' && perNama.trim() && !perNama.toUpperCase().includes('TOTAL') && !perNama.toUpperCase().includes('KINERJA') && isNaN(Number(perNama))) {
        const tgl = excelDateToJS(row[cfg.perbaikan.start]) || excelDateToJS(row[cfg.perbaikan.finish]) || '2026-09-01';
        let status = 'WAITING LIST';
        if (Number(row[cfg.perbaikan.selesai]) === 1) status = 'SELESAI';
        else if (Number(row[cfg.perbaikan.jadwal]) === 1) status = 'DIJADWALKAN';
        else if (excelDateToJS(row[cfg.perbaikan.finish])) status = 'SELESAI';

        pekerjaanRows.push({
          tim: cfg.tim,
          jenis: 'PERBAIKAN',
          pelanggan: perNama.trim(),
          alamat: null,
          tanggal: tgl,
          status: status,
          keterangan: row[cfg.perbaikan.ket] ? String(row[cfg.perbaikan.ket]).trim() : null
        });
      }

      // --- PEMUTUSAN ---
      const pemNama = row[cfg.pemutusan.nama];
      if (pemNama && typeof pemNama === 'string' && pemNama.trim() && !pemNama.toUpperCase().includes('TOTAL') && !pemNama.toUpperCase().includes('KINERJA') && isNaN(Number(pemNama))) {
        const tgl = excelDateToJS(row[cfg.pemutusan.start]) || excelDateToJS(row[cfg.pemutusan.finish]) || '2026-09-01';
        let status = 'WAITING LIST';
        if (Number(row[cfg.pemutusan.selesai]) === 1) status = 'SELESAI';
        else if (Number(row[cfg.pemutusan.jadwal]) === 1) status = 'DIJADWALKAN';
        else if (excelDateToJS(row[cfg.pemutusan.finish])) status = 'SELESAI';

        pekerjaanRows.push({
          tim: cfg.tim,
          jenis: 'PEMUTUSAN',
          pelanggan: pemNama.trim(),
          alamat: null,
          tanggal: tgl,
          status: status,
          keterangan: row[cfg.pemutusan.ket] ? String(row[cfg.pemutusan.ket]).trim() : null
        });
      }
    }
  }

  // --- ODP LOS AS PERBAIKAN KHUSUS (ODP/ODC) ---
  const odpWs = wb.Sheets['ODP LOS'];
  const odpRaw = XLSX.utils.sheet_to_json(odpWs, { header: 1 });
  for (let r = 4; r < odpRaw.length; r++) {
    const row = odpRaw[r];
    if (!row) continue;
    const odpNama = row[1];
    if (odpNama && typeof odpNama === 'string' && odpNama.trim() && !odpNama.toUpperCase().includes('TOTAL')) {
      const userCount = row[5] ? Number(row[5]) : null;
      let assignedTeam = 'GATRA - AIS';
      if (Number(row[8]) === 1) assignedTeam = 'AZWAR - RIO';
      else if (Number(row[9]) === 1) assignedTeam = 'IQBAL - JUSMAN';

      const tgl = excelDateToJS(row[3]) || excelDateToJS(row[4]) || '2026-09-01';
      const status = row[4] ? 'SELESAI' : 'WAITING LIST';
      const ket = (row[2] || 'ODP LOS') + (userCount ? ` (${userCount} User Terdampak)` : '');

      pekerjaanRows.push({
        tim: assignedTeam,
        jenis: 'PERBAIKAN',
        pelanggan: odpNama.trim(),
        alamat: null,
        tanggal: tgl,
        status: status,
        keterangan: `[ODP LOS] ${ket}`
      });
    }
  }

  console.log(`Inserting ${pekerjaanRows.length} pekerjaan rows...`);
  const { data: insPek, error: errPek } = await client.from('pekerjaan').insert(pekerjaanRows).select();
  if (errPek) console.error('Error inserting pekerjaan:', errPek.message);
  else console.log('Successfully inserted pekerjaan:', insPek.length);

  console.log(`Inserting ${leadsRows.length} leads rows...`);
  const { data: insLeads, error: errLeads } = await client.from('leads').insert(leadsRows).select();
  if (errLeads) console.error('Error inserting leads:', errLeads.message);
  else console.log('Successfully inserted leads:', insLeads.length);

  // 3. DAFTAR GANGGUAN & GANGGUAN
  const dgWs = wb.Sheets['Daftar Gangguan '];
  const dgRaw = XLSX.utils.sheet_to_json(dgWs);
  const daftarGangguanRows = [];
  const gangguanRows = [];

  for (const item of dgRaw) {
    if (!item.Nama || typeof item.Nama !== 'string') continue;
    const tglMulai = excelDateToJS(item['Tanggal Mulai']) || '';
    const fu = excelDateToJS(item.FollUp) || '';
    const kontak = item.Kontak ? String(item.Kontak) : '';
    const ket = item.Keterangan ? String(item.Keterangan) : '';
    const hasil = item['Hasil FU'] ? String(item['Hasil FU']) : '';

    daftarGangguanRows.push({
      nama: item.Nama.trim(),
      keterangan: ket,
      kontak: kontak,
      tanggal_mulai: tglMulai,
      follow_up: fu,
      hasil_fu: hasil
    });

    // Derive category for gangguan table
    let kategori = 'Modem';
    const low = ket.toLowerCase();
    if (low.includes('kabel') || low.includes('putus')) kategori = 'Kabel Putus';
    else if (low.includes('internet')) kategori = 'No Internet';
    else if (low.includes('redaman')) kategori = 'Redaman Tinggi';
    else if (low.includes('tidak muncul') || low.includes('lampu hidup')) kategori = 'Tidak Muncul';
    else if (low.includes('server')) kategori = 'Server';

    gangguanRows.push({
      tanggal: tglMulai || '2026-09-01',
      kategori: kategori,
      pelanggan: item.Nama.trim(),
      alamat: null,
      status: hasil.toLowerCase().includes('aman') ? 'SELESAI' : 'PROGRESS',
      keterangan: ket,
      user_terdampak: 1
    });
  }

  console.log(`Inserting ${daftarGangguanRows.length} daftar_gangguan rows...`);
  const { data: insDg, error: errDg } = await client.from('daftar_gangguan').insert(daftarGangguanRows).select();
  if (errDg) console.error('Error inserting daftar_gangguan:', errDg.message);
  else console.log('Successfully inserted daftar_gangguan:', insDg.length);

  console.log(`Inserting ${gangguanRows.length} gangguan rows...`);
  const { data: insG, error: errG } = await client.from('gangguan').insert(gangguanRows).select();
  if (errG) console.error('Error inserting gangguan:', errG.message);
  else console.log('Successfully inserted gangguan:', insG.length);

  // 4. ODP / ODC
  const fuWs = wb.Sheets['FU Pelanggan Redaman Tinggi'];
  const fuRaw = XLSX.utils.sheet_to_json(fuWs, { header: 1 });
  const odpOdcRows = [];
  let currentOdc = 'ODC 1';

  for (let r = 0; r < fuRaw.length; r++) {
    const row = fuRaw[r];
    if (!row || !row.length) continue;
    if (row[0] && typeof row[0] === 'string' && row[0].toUpperCase().startsWith('ODC')) {
      currentOdc = row[0].trim();
      continue;
    }
    const odpNama = row[1];
    if (odpNama && typeof odpNama === 'string' && odpNama.trim()) {
      const ket = row[2] ? String(row[2]).trim() : '';
      let status = '';
      if (ket.toLowerCase().includes('perbaik')) status = 'Diperbaiki';
      else if (ket.toLowerCase().includes('aman')) status = 'Aman';

      odpOdcRows.push({
        odc: currentOdc,
        nama: odpNama.trim(),
        keterangan: ket,
        status: status
      });
    }
  }

  console.log(`Inserting ${odpOdcRows.length} odp_odc rows...`);
  const { data: insOdp, error: errOdp } = await client.from('odp_odc').insert(odpOdcRows).select();
  if (errOdp) console.error('Error inserting odp_odc:', errOdp.message);
  else console.log('Successfully inserted odp_odc:', insOdp.length);

  // 5. PENGAJUAN PEMUTUSAN
  const putusWs = wb.Sheets['PENGAJUAN PEMUTUSAN '];
  const putusRaw = XLSX.utils.sheet_to_json(putusWs);
  const putusRows = [];
  for (const item of putusRaw) {
    const nama = item['Nama '];
    if (!nama || typeof nama !== 'string') continue;
    putusRows.push({
      nama: nama.trim(),
      kontak: item.Kontak ? String(item.Kontak) : '',
      alasan: item['Sebab/alasan'] ? String(item['Sebab/alasan']) : '',
      tanggal: item['Tanggal Pengajuan Pemutusan'] ? excelDateToJS(item['Tanggal Pengajuan Pemutusan']) : null
    });
  }

  console.log(`Inserting ${putusRows.length} pengajuan_pemutusan rows...`);
  const { data: insPutus, error: errPutus } = await client.from('pengajuan_pemutusan').insert(putusRows).select();
  if (errPutus) console.error('Error inserting pengajuan_pemutusan:', errPutus.message);
  else console.log('Successfully inserted pengajuan_pemutusan:', insPutus.length);

  console.log('=== ALL REAL DATA IMPORT COMPLETED SUCCESSFULLY ===');
}

run();
