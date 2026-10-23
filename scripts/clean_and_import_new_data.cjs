/**
 * XNet Wi-Fi Manager - Data Management & Ingestion Utility
 * 
 * Penggunaan:
 *   1. Impor seluruh 10 bulan (Januari 2026 s/d Oktober 2026) dari folder data_bulanan_2026:
 *      node scripts/clean_and_import_new_data.cjs --import-all
 * 
 *   2. Impor berkas tunggal (.xlsx):
 *      node scripts/clean_and_import_new_data.cjs --import <path/ke/file_data.xlsx>
 * 
 *   3. Bersihkan seluruh data operasional (Reset ke kondisi bersih):
 *      node scripts/clean_and_import_new_data.cjs --clean
 * 
 *   4. Cek status data saat ini:
 *      node scripts/clean_and_import_new_data.cjs --status
 */

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const MOCK_DATA_PATH = path.resolve(__dirname, "../src/data/mockData.js");
const IMPORTED_DATA_PATH = path.resolve(__dirname, "../src/data/latest_imported_data.json");
const UNIFIED_ODP_PATH = path.resolve(__dirname, "../src/data/unifiedOdpOdc.json");
const MONTHLY_DIR = path.resolve(__dirname, "../data_bulanan_2026");

const MONTHLY_FILES = [
  { file: '01_januari_TIM_WIFI_JANUARI_2026.xlsx', month: '2026-01', fallbackDate: '2026-01-15' },
  { file: '02_februari_TIM_WIFI_FEBRUARI_2026.xlsx', month: '2026-02', fallbackDate: '2026-02-15' },
  { file: '03_maret_TIM_WIFI_MARET_2026.xlsx', month: '2026-03', fallbackDate: '2026-03-15' },
  { file: '04_april_TIM_WIFI_APRIL_2026.xlsx', month: '2026-04', fallbackDate: '2026-04-15' },
  { file: '05_mei_TIM_WIFI_MEI_2026.xlsx', month: '2026-05', fallbackDate: '2026-05-15' },
  { file: '06_juni_TIM_WIFI_JUNI_2026.xlsx', month: '2026-06', fallbackDate: '2026-06-15' },
  { file: '07_juli_TIM_WIFI_JULI_2026.xlsx', month: '2026-07', fallbackDate: '2026-07-15' },
  { file: '08_agustus_TIM_WIFI_AGUSTUS_2026.xlsx', month: '2026-08', fallbackDate: '2026-08-15' },
  { file: '09_september_TIM_WIFI_SEPTEMBER_2026.xlsx', month: '2026-09', fallbackDate: '2026-09-15' },
  { file: '10_oktober_TIM_WIFI_OKTOBER_2026.xlsx', month: '2026-10', fallbackDate: '2026-10-15' },
];

function getOdpSummary() {
  try {
    if (fs.existsSync(UNIFIED_ODP_PATH)) {
      const data = JSON.parse(fs.readFileSync(UNIFIED_ODP_PATH, "utf8"));
      return {
        odpCount: (data.odpList || []).length,
        odcCount: (data.odcList || []).length,
      };
    }
  } catch {}
  return { odpCount: 0, odcCount: 0 };
}

function excelDateToDate(serial, fallback = "2026-10-01") {
  if (!serial) return fallback;
  if (typeof serial === "string") {
    const s = serial.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const parts = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (parts) return `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    return fallback;
  }
  if (!isNaN(serial) && serial > 30000 && serial < 60000) {
    const utc_days = Math.floor(serial - 25569);
    return new Date(utc_days * 86400 * 1000).toISOString().split("T")[0];
  }
  return fallback;
}

function cleanOperationalData() {
  console.log("\n=======================================================");
  console.log("🧹 [MEMBERSIHKAN DATA OPERASIONAL LAMA NEXUS/XNET]");
  console.log("=======================================================\n");

  const odpInfo = getOdpSummary();
  console.log(`🔒 Infrastruktur Dilindungi (TIDAK DIHAPUS):`);
  console.log(`   - Master ODP (Google Earth KML): ${odpInfo.odpCount} titik ODP`);
  console.log(`   - Master ODC (Google Earth KML): ${odpInfo.odcCount} titik ODC`);
  console.log(`   - Master Tim: Tim A, Tim B, Tim C & Personil Teknisi\n`);

  const emptyPayload = {
    timestamp: new Date().toISOString(),
    status: "CLEANED",
    pekerjaan: [],
    leads: [],
    pelanggan: [],
    gangguan: [],
    pengajuan_pemutusan: [],
    redaman_tinggi: [],
  };
  fs.writeFileSync(IMPORTED_DATA_PATH, JSON.stringify(emptyPayload, null, 2), "utf8");

  updateMockDataFile([], [], [], [], [], []);
  console.log("✅ Berkas `src/data/mockData.js` & `latest_imported_data.json` dikosongkan.");
}

function showStatus() {
  console.log("\n=======================================================");
  console.log("📊 STATUS DATA SAAT INI (NEXUS/XNET MANAGEMENT)");
  console.log("=======================================================\n");

  const odpInfo = getOdpSummary();
  console.log(`📌 Master Infrastruktur Jaringan:`);
  console.log(`   - Titik ODP Aktif: ${odpInfo.odpCount}`);
  console.log(`   - Titik ODC Master: ${odpInfo.odcCount}`);

  if (fs.existsSync(IMPORTED_DATA_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(IMPORTED_DATA_PATH, "utf8"));
      console.log(`\n📦 Dataset Terakhir Diimpor (${data.timestamp || "N/A"}):`);
      console.log(`   - Sumber Data        : ${data.sourceFiles ? data.sourceFiles.join(', ') : (data.sourceFile || "N/A")}`);
      console.log(`   - Pekerjaan Lapangan : ${(data.pekerjaan || []).length} entri`);
      console.log(`   - Calon Leads/Prospek : ${(data.leads || []).length} entri`);
      console.log(`   - Pelanggan Radius   : ${(data.pelanggan || []).length} entri`);
      console.log(`   - Tiket Gangguan     : ${(data.gangguan || []).length} entri`);
      console.log(`   - Pengajuan Putus    : ${(data.pengajuan_pemutusan || []).length} entri`);
    } catch {}
  } else {
    console.log("\n📦 Belum ada dataset baru yang diimpor (Status: Bersih).");
  }
  console.log("\n=======================================================\n");
}

function parseWorkbook(workbook, monthMeta, globalCounters) {
  const result = {
    pekerjaan: [],
    leads: [],
    pelanggan: [],
    gangguan: [],
    pengajuan_pemutusan: [],
    redaman_tinggi: [],
  };

  const defaultDate = monthMeta.fallbackDate || "2026-10-01";

  // Team configurations
  const teamConfigs = [
    { sheetMatch: "GATRA", tim: "Tim A", teknisi: ["AIS", "Gatra"] },
    { sheetMatch: "IQBAL", tim: "Tim B", teknisi: ["Jusman", "Iqbal"] },
    { sheetMatch: "AZWAR", tim: "Tim C", teknisi: ["Azwar", "Rio"] },
  ];

  teamConfigs.forEach(tc => {
    const sheetName = workbook.SheetNames.find(s => s.toUpperCase().includes(tc.sheetMatch));
    if (!sheetName) return;

    // Detect if team members are Azwar-Wahyu or Azwar-Rio
    let teknisiMembers = tc.teknisi;
    if (tc.sheetMatch === "AZWAR" && sheetName.toUpperCase().includes("WAHYU")) {
      teknisiMembers = ["Azwar", "Wahyu"];
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const r2 = rows[2] || [];
    const r0 = rows[0] || [];

    // Detect blocks dynamically
    const blocks = [];
    for (let c = 0; c < 50; c++) {
      if (String(r2[c] || '').trim().toLowerCase() === 'no' && String(r2[c + 1] || '').trim().toLowerCase() === 'nama') {
        let title = '';
        for (let tcCol = c; tcCol >= Math.max(0, c - 5); tcCol--) {
          if (r0[tcCol]) { title = String(r0[tcCol]); break; }
        }
        blocks.push({ colNo: c, colNama: c + 1, title });
      }
    }

    rows.slice(5).forEach(r => {
      // 1. PSB (Block 0)
      if (blocks.length > 0) {
        const c = blocks[0].colNo;
        const psbNama = r[c + 1] && typeof r[c + 1] === "string" ? r[c + 1].trim() : null;
        if (psbNama && psbNama.toLowerCase() !== "nama" && !psbNama.toUpperCase().includes("TOTAL")) {
          const start = excelDateToDate(r[c + 3], defaultDate);
          const finish = r[c + 4] ? excelDateToDate(r[c + 4], start) : null;
          const alamat = (r[c + 2] && String(r[c + 2]).trim()) || "Pontianak";
          const ket = r[c + 5] ? String(r[c + 5]).trim() : "";
          
          const isSelesai = r[c + 8] === 1 || finish !== null;
          const isGagal = r[c + 9] === 1 || (r[c + 6] === 0 && ket.length > 0 && /gagal|batal|cancel|tidak|kendala/i.test(ket));
          const status = isGagal ? "GAGAL" : isSelesai ? "SELESAI" : "WAITING LIST";

          // Sumber Leads
          let sumber = "IKLAN";
          if (r[c + 12] === 1) sumber = "AFFILIATE";
          else if (r[c + 13] === 1) sumber = "MARKETING";
          else if (r[c + 11] === 1) sumber = "IKLAN";
          else if (/affiliate/i.test(ket)) sumber = "AFFILIATE";
          else if (/marketing/i.test(ket)) sumber = "MARKETING";

          const taskId = ++globalCounters.taskId;
          result.pekerjaan.push({
            id: taskId,
            spk_no: `SPK/PSB/${start.replace(/-/g, "")}/${String(taskId).padStart(4, "0")}`,
            pelanggan: psbNama,
            jenis: "PEMASANGAN",
            status,
            prioritas: "NORMAL",
            sesi: "PAGI",
            tim: tc.tim,
            teknisi_list: teknisiMembers,
            alamat,
            tanggal: start,
            keterangan: ket || `Pemasangan baru ${psbNama}`,
            komisi_total: status === "SELESAI" ? 18000 : 0,
          });

          result.leads.push({
            id: ++globalCounters.leadId,
            nama: psbNama,
            alamat,
            sumber,
            status: status === "SELESAI" ? "SELESAI" : status === "GAGAL" ? "GAGAL" : "BARU",
            tanggal: start,
            keterangan_survey: ket || "Survey awal PSB",
          });

          if (status === "SELESAI") {
            const custId = ++globalCounters.pelangganId;
            result.pelanggan.push({
              id: custId,
              id_pelanggan: `NX-2026-${String(custId).padStart(4, "0")}`,
              nama: psbNama,
              telepon: "-",
              alamat,
              odp: "ODP 1.1",
              paket: "Home Fiber 30 Mbps",
              status: "AKTIF",
              ip_address: "-",
              tgl_daftar: start,
            });
          }
        }
      }

      // 2. Block 1 (RPR or DIS/Penarikan)
      if (blocks.length > 1) {
        const c = blocks[1].colNo;
        const b1Nama = r[c + 1] && typeof r[c + 1] === "string" ? r[c + 1].trim() : null;
        if (b1Nama && b1Nama.toLowerCase() !== "nama" && !b1Nama.toUpperCase().includes("TOTAL")) {
          const isDisOrPenarikan = /penarikan|pemutusan/i.test(blocks[1].title) || /pemutusan|dismantle|cabut/i.test(String(r[c + 4] || r[c + 5] || ''));
          
          if (isDisOrPenarikan) {
            const start = excelDateToDate(r[c + 2] || r[c + 3], defaultDate);
            const ket = (r[c + 4] || r[c + 5] || r[c + 2]) ? String(r[c + 4] || r[c + 5] || r[c + 2]).trim() : "Pemutusan / Dismantle";
            const taskId = ++globalCounters.taskId;
            result.pekerjaan.push({
              id: taskId,
              spk_no: `SPK/DIS/${start.replace(/-/g, "")}/${String(taskId).padStart(4, "0")}`,
              pelanggan: b1Nama,
              jenis: "PEMUTUSAN",
              status: "SELESAI",
              prioritas: "NORMAL",
              sesi: "PAGI",
              tim: tc.tim,
              teknisi_list: teknisiMembers,
              alamat: "-",
              tanggal: start,
              keterangan: ket || `Pemutusan & dismantle perangkat ${b1Nama}`,
              komisi_total: 5000,
            });
          } else {
            // Perbaikan (RPR)
            const start = excelDateToDate(r[c + 2] || r[c + 3], defaultDate);
            const finish = r[c + 3] ? excelDateToDate(r[c + 3], start) : null;
            const ket = (r[c + 4] || r[c + 2]) ? String(r[c + 4] || r[c + 2]).trim() : "";
            const isSelesai = finish !== null || r[c + 7] === 1 || r[c + 8] === 1 || r[c + 9] === 1;
            const status = isSelesai ? "SELESAI" : "WAITING LIST";

            const taskId = ++globalCounters.taskId;
            result.pekerjaan.push({
              id: taskId,
              spk_no: `SPK/RPR/${start.replace(/-/g, "")}/${String(taskId).padStart(4, "0")}`,
              pelanggan: b1Nama,
              jenis: "PERBAIKAN",
              status,
              prioritas: "URGENT",
              sesi: "SORE",
              tim: tc.tim,
              teknisi_list: teknisiMembers,
              alamat: "-",
              tanggal: start,
              keterangan: ket || `Perbaikan koneksi ${b1Nama}`,
              komisi_total: status === "SELESAI" ? 8500 : 0,
            });
          }
        }
      }

      // 3. Block 2 (DIS / Pemutusan)
      if (blocks.length > 2) {
        const c = blocks[2].colNo;
        const disNama = r[c + 1] && typeof r[c + 1] === "string" ? r[c + 1].trim() : null;
        if (disNama && disNama.toLowerCase() !== "nama" && !disNama.toUpperCase().includes("TOTAL")) {
          const start = excelDateToDate(r[c + 2], defaultDate);
          const finish = r[c + 3] ? excelDateToDate(r[c + 3], start) : null;
          const ket = r[c + 4] ? String(r[c + 4]).trim() : "";
          // Check columns for Selesai / Dijadwalkan / No Progress
          const isSelesai = finish !== null || r[c + 8] === 1;
          const isDijadwalkan = r[c + 7] === 1;
          const status = isSelesai ? "SELESAI" : isDijadwalkan ? "DIJADWALKAN" : "WAITING LIST";

          const taskId = ++globalCounters.taskId;
          result.pekerjaan.push({
            id: taskId,
            spk_no: `SPK/DIS/${start.replace(/-/g, "")}/${String(taskId).padStart(4, "0")}`,
            pelanggan: disNama,
            jenis: "PEMUTUSAN",
            status,
            prioritas: "NORMAL",
            sesi: "PAGI",
            tim: tc.tim,
            teknisi_list: teknisiMembers,
            alamat: "-",
            tanggal: start,
            keterangan: ket || `Pemutusan & dismantle perangkat ${disNama}`,
            komisi_total: status === "SELESAI" ? 5000 : 0,
          });
        }
      }
    });
  });

  // 4. Daftar Gangguan / Gangguan Mingguan / Non Teknisi
  const dgSheetNames = workbook.SheetNames.filter(s => {
    const sUp = s.toUpperCase();
    return sUp.includes("GANGGUAN") && !sUp.includes("ODP") && !sUp.includes("INTERNAL");
  });

  dgSheetNames.forEach(dgSheetName => {
    const dgRows = XLSX.utils.sheet_to_json(workbook.Sheets[dgSheetName]);
    dgRows.forEach((r) => {
      const rawNama = (r.Nama || r.nama || r["Nama Pelanggan"] || "").trim();
      if (!rawNama || rawNama.toLowerCase() === "nama" || rawNama.toUpperCase().includes("TOTAL")) return;

      const ket = (r.Keterangan || r.keterangan || r.Reaksi || "Gangguan koneksi").trim();
      let kontak = "-";
      if (r.Kontak) kontak = String(r.Kontak).replace(/^62/, "0").replace(/[\r\n\t]/g, " ").trim();
      
      const tglMulai = excelDateToDate(r["Tanggal Mulai"] || r.Start, defaultDate);
      const followUp = r.FollUp || r.FollowUp || r["Tanggal Selesai"] || r.Finish ? excelDateToDate(r.FollUp || r.FollowUp || r["Tanggal Selesai"] || r.Finish, tglMulai) : "-";
      const hasilFU = r["Hasil FU"] ? String(r["Hasil FU"]).trim() : (r.Keterangan ? String(r.Keterangan).trim() : "Aman");
      const isAman = /aman|normal|selesai|sudah/i.test(hasilFU);

      result.gangguan.push({
        id: ++globalCounters.gangguanId,
        nama: rawNama,
        keterangan: ket,
        kontak,
        tanggalMulai: tglMulai,
        followUp,
        hasilFU,
        status: isAman ? "SELESAI" : "PROSES",
      });
    });
  });

  // 5. Pengajuan Pemutusan
  const ppSheetNames = workbook.SheetNames.filter(s => s.toUpperCase().includes("PEMUTUSAN"));
  ppSheetNames.forEach(ppSheetName => {
    const ppRows = XLSX.utils.sheet_to_json(workbook.Sheets[ppSheetName]);
    ppRows.forEach((r) => {
      const rawNama = (r["Nama "] || r.Nama || r.nama || "").trim();
      if (!rawNama || rawNama.toLowerCase() === "nama" || rawNama.toUpperCase().includes("TOTAL")) return;

      let kontak = "-";
      if (r.Kontak) kontak = String(r.Kontak).replace(/^62/, "0").replace(/[\r\n\t]/g, " ").trim();
      const alasan = (r["Sebab/alasan"] || r.alasan || r["Perkiraan sebab"] || "Permintaan pelanggan").replace(/[\r\n\t]/g, " ").trim();
      const tgl = excelDateToDate(r["Tanggal Pengajuan Pemutusan"] || r.Tanggal, defaultDate);

      result.pengajuan_pemutusan.push({
        id: ++globalCounters.pemutusanId,
        nama: rawNama,
        kontak,
        alasan,
        tanggal: tgl,
        status: "SELESAI",
      });
    });
  });

  // 6. ODP LOS
  const odpLosName = workbook.SheetNames.find(s => s.toUpperCase().includes("ODP LOS"));
  if (odpLosName) {
    const odpLosRows = XLSX.utils.sheet_to_json(workbook.Sheets[odpLosName], { header: 1 });
    odpLosRows.slice(5).forEach((r) => {
      if (r[1] && typeof r[1] === "string" && r[1].toUpperCase().includes("ODP")) {
        const odp = String(r[1]).trim();
        const ket = r[2] ? String(r[2]).trim() : "ODP LOS / Perbaikan Redaman";
        const start = excelDateToDate(r[3], defaultDate);
        const taskId = ++globalCounters.taskId;
        result.pekerjaan.push({
          id: taskId,
          spk_no: `SPK/RPR/${start.replace(/-/g, "")}/${String(taskId).padStart(4, "0")}`,
          pelanggan: `Infrastruktur ${odp}`,
          jenis: "PERBAIKAN KHUSUS (ODP/ODC)",
          status: "SELESAI",
          prioritas: "URGENT",
          sesi: "PAGI",
          tim: "Tim A",
          teknisi_list: ["AIS", "Gatra"],
          alamat: `Tiang ODP ${odp}`,
          odp,
          tanggal: start,
          keterangan: ket,
          komisi_total: 10000,
        });
      }
    });
  }

  // 7. FU Pelanggan Redaman Tinggi
  const redamanSheetName = workbook.SheetNames.find(s => s.toUpperCase().includes("REDAMAN TINGGI"));
  if (redamanSheetName) {
    const rRows = XLSX.utils.sheet_to_json(workbook.Sheets[redamanSheetName], { header: 1 });
    let currentOdc = "ODC 1";
    rRows.forEach(r => {
      if (r[0] && typeof r[0] === 'string' && r[0].includes('ODC')) {
        currentOdc = r[0].trim();
      }
      if (r[1] && typeof r[1] === 'string' && (r[1].includes('ODP') || r[1].includes('-'))) {
        result.redaman_tinggi.push({
          odc: currentOdc,
          pelanggan: r[1].trim(),
          status: r[2] ? String(r[2]).trim() : "Tinggi",
          bulan: monthMeta.month,
        });
      }
    });
  }

  return result;
}

function importAll10Months() {
  console.log("\n=======================================================");
  console.log("🚀 [MEMULAI IMPOR DATA UTUH 10 BULAN (JANUARI - OKTOBER 2026)]");
  console.log("=======================================================\n");

  const XLSX = require("xlsx");

  const globalCounters = {
    taskId: 1000,
    leadId: 2000,
    pelangganId: 1000,
    gangguanId: 3000,
    pemutusanId: 4000,
  };

  const aggregated = {
    timestamp: new Date().toISOString(),
    datasetRange: "2026-01 s/d 2026-10",
    sourceFiles: MONTHLY_FILES.map(f => f.file),
    pekerjaan: [],
    leads: [],
    pelanggan: [],
    gangguan: [],
    pengajuan_pemutusan: [],
    redaman_tinggi: [],
  };

  MONTHLY_FILES.forEach(mMeta => {
    const filePath = path.join(MONTHLY_DIR, mMeta.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Berkas tidak ditemukan: ${mMeta.file}`);
      return;
    }

    console.log(`📂 Memproses Bulan ${mMeta.month} (${mMeta.file})...`);
    const wb = XLSX.readFile(filePath);
    const parsed = parseWorkbook(wb, mMeta, globalCounters);

    aggregated.pekerjaan.push(...parsed.pekerjaan);
    aggregated.leads.push(...parsed.leads);
    aggregated.pelanggan.push(...parsed.pelanggan);
    aggregated.gangguan.push(...parsed.gangguan);
    aggregated.pengajuan_pemutusan.push(...parsed.pengajuan_pemutusan);
    aggregated.redaman_tinggi.push(...parsed.redaman_tinggi);

    console.log(`   -> Selesai: +${parsed.pekerjaan.length} SPK, +${parsed.leads.length} Leads, +${parsed.gangguan.length} Gangguan, +${parsed.pengajuan_pemutusan.length} Pemutusan`);
  });

  // Save to JSON
  fs.writeFileSync(IMPORTED_DATA_PATH, JSON.stringify(aggregated, null, 2), "utf8");
  console.log(`\n💾 Arsip JSON disimpan ke: ${path.relative(process.cwd(), IMPORTED_DATA_PATH)}`);

  // Update mockData.js
  updateMockDataFile(
    aggregated.pekerjaan,
    aggregated.leads,
    aggregated.gangguan,
    aggregated.pengajuan_pemutusan,
    aggregated.pelanggan,
    aggregated.redaman_tinggi
  );

  console.log("\n=======================================================");
  console.log("🎉 SUKSES: SELURUH DATA JANUARI - OKTOBER 2026 TELAH MASUK KE SISTEM!");
  console.log(`   - Total SPK Pekerjaan : ${aggregated.pekerjaan.length} entri`);
  console.log(`   - Total Leads Masuk   : ${aggregated.leads.length} entri`);
  console.log(`   - Total Pelanggan Aktif: ${aggregated.pelanggan.length} entri`);
  console.log(`   - Total Tiket Gangguan : ${aggregated.gangguan.length} entri`);
  console.log(`   - Total Pengajuan Putus: ${aggregated.pengajuan_pemutusan.length} entri`);
  console.log(`   - Total Redaman Tinggi : ${aggregated.redaman_tinggi.length} entri`);
  console.log("=======================================================\n");
}

function updateMockDataFile(pekerjaan, leads, gangguan, pengajuan, pelanggan, redaman = []) {
  // Hitung metrik teknisi perorangan dari SPK yang selesai
  const personilStats = {
    AIS: { selesai: 0, komisi: 0 },
    Gatra: { selesai: 0, komisi: 0 },
    Jusman: { selesai: 0, komisi: 0 },
    Iqbal: { selesai: 0, komisi: 0 },
    Azwar: { selesai: 0, komisi: 0 },
    Rio: { selesai: 0, komisi: 0 },
    Wahyu: { selesai: 0, komisi: 0 },
  };

  pekerjaan.filter(p => p.status === "SELESAI").forEach(p => {
    const list = p.teknisi_list || [];
    list.forEach(tech => {
      if (personilStats[tech]) {
        personilStats[tech].selesai++;
        personilStats[tech].komisi += (p.komisi_total || 0);
      }
    });
  });

  const personilList = [
    {
      id: 1,
      nama: "Ais Maulana",
      panggilan: "AIS",
      telepon: "081234567890",
      peran: "Installer / Field Tech",
      timId: 1,
      timNama: "Tim A",
      status: "AKTIF",
      total_selesai: personilStats.AIS.selesai,
      total_komisi: personilStats.AIS.komisi,
    },
    {
      id: 2,
      nama: "Gatra Wicaksono",
      panggilan: "Gatra",
      telepon: "081234567891",
      peran: "Splicer / Fiber Specialist",
      timId: 1,
      timNama: "Tim A",
      status: "AKTIF",
      total_selesai: personilStats.Gatra.selesai,
      total_komisi: personilStats.Gatra.komisi,
    },
    {
      id: 3,
      nama: "Jusman",
      panggilan: "Jusman",
      telepon: "081298765432",
      peran: "Team Leader / Field Tech",
      timId: 2,
      timNama: "Tim B",
      status: "AKTIF",
      total_selesai: personilStats.Jusman.selesai,
      total_komisi: personilStats.Jusman.komisi,
    },
    {
      id: 4,
      nama: "Iqbal Ramadhan",
      panggilan: "Iqbal",
      telepon: "081298765433",
      peran: "Installer / Field Tech",
      timId: 2,
      timNama: "Tim B",
      status: "AKTIF",
      total_selesai: personilStats.Iqbal.selesai,
      total_komisi: personilStats.Iqbal.komisi,
    },
    {
      id: 5,
      nama: "Azwar",
      panggilan: "Azwar",
      telepon: "08125556677",
      peran: "Specialist ODP/ODC",
      timId: 3,
      timNama: "Tim C",
      status: "AKTIF",
      total_selesai: personilStats.Azwar.selesai,
      total_komisi: personilStats.Azwar.komisi,
    },
    {
      id: 6,
      nama: "Rio Saputra",
      panggilan: "Rio",
      telepon: "08125556678",
      peran: "Field Technician",
      timId: 3,
      timNama: "Tim C",
      status: "AKTIF",
      total_selesai: personilStats.Rio.selesai,
      total_komisi: personilStats.Rio.komisi,
    },
  ];

  // Hitung summary metrik
  const psbList = pekerjaan.filter(p => p.jenis === "PEMASANGAN");
  const rprList = pekerjaan.filter(p => p.jenis === "PERBAIKAN");
  const disList = pekerjaan.filter(p => p.jenis === "PEMUTUSAN");

  const summaryData = {
    totalPekerjaan: pekerjaan.length,
    totalLeads: leads.length,
    pemasangan: {
      waitingList: psbList.filter(p => p.status === "WAITING LIST").length,
      dijadwalkan: psbList.filter(p => p.status === "DIJADWALKAN").length,
      selesai: psbList.filter(p => p.status === "SELESAI").length,
      gagal: psbList.filter(p => p.status === "GAGAL").length,
    },
    perbaikan: {
      waitingList: rprList.filter(p => p.status === "WAITING LIST").length,
      dijadwalkan: rprList.filter(p => p.status === "DIJADWALKAN").length,
      selesai: rprList.filter(p => p.status === "SELESAI").length,
    },
    pemutusan: {
      waitingList: disList.filter(p => p.status === "WAITING LIST").length,
      dijadwalkan: disList.filter(p => p.status === "DIJADWALKAN").length,
      selesai: disList.filter(p => p.status === "SELESAI").length,
      gagal: disList.filter(p => p.status === "GAGAL").length,
    },
    sumberLeads: {
      IKLAN: leads.filter(l => l.sumber === "IKLAN").length,
      MARKETING: leads.filter(l => l.sumber === "MARKETING").length,
      AFFILIATE: leads.filter(l => l.sumber === "AFFILIATE").length,
    },
    odpOdc: {
      total: pekerjaan.filter(p => p.jenis === "PERBAIKAN KHUSUS (ODP/ODC)").length,
      userTerdampak: 0,
    },
  };

  const codeContent = `import unifiedOdpOdc from "./unifiedOdpOdc.json";

export const bulan = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });

// Master Personil Teknisi Perorangan (Individu)
export const initialPersonilList = ${JSON.stringify(personilList, null, 2)};

// Master Regu Tim (Pengelompokan Teknisi)
export const timList = [
  {
    id: 1,
    nama: "Tim A",
    anggota: ["AIS", "Gatra"],
    alias: "GATRA - AIS",
    status: "AKTIF",
    telepon: "081234567890",
    area: "Pontianak Kota / Siantan",
  },
  {
    id: 2,
    nama: "Tim B",
    anggota: ["Jusman", "Iqbal"],
    alias: "PUTRA - FAISAL",
    status: "AKTIF",
    telepon: "081298765432",
    area: "Pontianak Barat / Sungai Jawi",
  },
  {
    id: 3,
    nama: "Tim C",
    anggota: ["Azwar", "Rio"],
    alias: "AZWAR - RIO",
    status: "AKTIF",
    telepon: "08125556677",
    area: "Pontianak Selatan / Tenggara",
  },
];

export const statusPekerjaan = [
  "WAITING LIST",
  "DIJADWALKAN",
  "MENUNGGU VALIDASI",
  "SELESAI",
  "GAGAL",
];

export const jenisPekerjaan = [
  "PEMASANGAN",
  "PERBAIKAN",
  "PEMUTUSAN",
  "PERBAIKAN KHUSUS (ODP/ODC)",
  "RELOKASI",
];

export const sumberLeads = ["IKLAN", "AFFILIATE", "MARKETING"];

export const kategoriGangguan = [
  "Tidak Muncul",
  "Kabel Putus",
  "No Internet",
  "Modem",
  "Redaman Tinggi",
  "Server",
  "Pusat",
];

export const initialTimData = timList;

// Data Operasional Riil (Januari - Oktober 2026)
export const pekerjaanList = ${JSON.stringify(pekerjaan, null, 2)};

export const leadsList = ${JSON.stringify(leads, null, 2)};
export const initialLeads = leadsList;

export const gangguanList = ${JSON.stringify(gangguan, null, 2)};
export const daftarGangguanList = gangguanList;
export const initialGangguanList = daftarGangguanList;

export const fuPelangganList = [];
export const redamanTinggiList = ${JSON.stringify(redaman, null, 2)};

export const pengajuanPemutusanList = ${JSON.stringify(pengajuan, null, 2)};

export const summaryData = ${JSON.stringify(summaryData, null, 2)};

export const gangguanData = {
  eksternal: {},
  totalCase: ${gangguan.length},
};

export function clearAllOperationalData() {
  if (typeof localStorage === "undefined") return;
  try {
    const operationalKeys = [
      "xnet_pekerjaan",
      "xnet_leads",
      "xnet_gangguan",
      "xnet_daftar_gangguan_v2",
      "xnet_pengajuan_pemutusan",
      "xnet_pelanggan_radius",
      "xnet_fu_pelanggan",
      "xnet_redaman_tinggi",
      "xnet_komisi_adjustments",
      "xnet_offline_queue_v1",
    ];
    operationalKeys.forEach((key) => {
      localStorage.setItem(key, "[]");
      window.dispatchEvent(
        new CustomEvent("xnet_storage_update", {
          detail: { key, value: [] },
        })
      );
    });
    console.log("🧹 [CLEANUP] Data operasional dikosongkan.");
  } catch (err) {
    console.warn("Gagal membersihkan data operasional:", err);
  }
}

export function seedAllDemoData() {}

// ODP/ODC Master hasil sinkronisasi Google Earth KML (TETAP DIPERTAHANKAN)
export const odpOdcList = unifiedOdpOdc.odpList || [];
export const odcMasterList = unifiedOdpOdc.odcList || [];

// Data Master Pelanggan Sinkronisasi Radius Billing
export const initialPelangganRadius = ${JSON.stringify(pelanggan, null, 2)};
`;

  fs.writeFileSync(MOCK_DATA_PATH, codeContent, "utf8");
  console.log(`✅ File ${path.relative(process.cwd(), MOCK_DATA_PATH)} berhasil diperbarui.`);
}

// CLI Routing
const args = process.argv.slice(2);
if (args.includes("--clean")) {
  cleanOperationalData();
} else if (args.includes("--status")) {
  showStatus();
} else if (args.includes("--import-all")) {
  importAll10Months();
} else if (args.includes("--import")) {
  const filePath = args[args.indexOf("--import") + 1];
  if (!filePath) {
    console.error("❌ Sertakan path berkas.");
    process.exit(1);
  }
  const XLSX = require("xlsx");
  const wb = XLSX.readFile(path.resolve(process.cwd(), filePath));
  const globalCounters = { taskId: 1000, leadId: 2000, pelangganId: 1000, gangguanId: 3000, pemutusanId: 4000 };
  const parsed = parseWorkbook(wb, { month: "2026-10", fallbackDate: "2026-10-01" }, globalCounters);
  fs.writeFileSync(IMPORTED_DATA_PATH, JSON.stringify(parsed, null, 2), "utf8");
  updateMockDataFile(parsed.pekerjaan, parsed.leads, parsed.gangguan, parsed.pengajuan_pemutusan, parsed.pelanggan, parsed.redaman_tinggi);
  console.log("✅ Impor berkas selesai!");
} else {
  console.log("Penggunaan: node scripts/clean_and_import_new_data.cjs [--clean | --status | --import-all | --import <file>]");
}
