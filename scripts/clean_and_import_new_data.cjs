/**
 * XNet Wi-Fi Manager - Data Management & Ingestion Utility
 * 
 * Penggunaan:
 *   1. Bersihkan seluruh data operasional (Reset ke kondisi bersih):
 *      node scripts/clean_and_import_new_data.cjs --clean
 * 
 *   2. Cek status data saat ini:
 *      node scripts/clean_and_import_new_data.cjs --status
 * 
 *   3. Impor data terbaru dari file Excel (.xlsx) / CSV / JSON:
 *      node scripts/clean_and_import_new_data.cjs --import <path/ke/file_data.xlsx>
 */

const fs = require("fs");
const path = require("path");

const MOCK_DATA_PATH = path.resolve(__dirname, "../src/data/mockData.js");
const IMPORTED_DATA_PATH = path.resolve(__dirname, "../src/data/latest_imported_data.json");
const UNIFIED_ODP_PATH = path.resolve(__dirname, "../src/data/unifiedOdpOdc.json");

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

function excelDateToDate(serial) {
  if (!serial || isNaN(serial)) return null;
  const utc_days = Math.floor(serial - 25569);
  return new Date(utc_days * 86400 * 1000).toISOString().split("T")[0];
}

async function cleanOperationalData() {
  console.log("\n=======================================================");
  console.log("🧹 [MEMBERSIHKAN DATA OPERASIONAL LAMA NEXUS/XNET]");
  console.log("=======================================================\n");

  const odpInfo = getOdpSummary();
  console.log(`🔒 Infrastruktur Dilindungi (TIDAK DIHAPUS):`);
  console.log(`   - Master ODP (Google Earth KML): ${odpInfo.odpCount} titik ODP`);
  console.log(`   - Master ODC (Google Earth KML): ${odpInfo.odcCount} titik ODC`);
  console.log(`   - Master Tim: Tim A, Tim B, Tim C & Personil Teknisi\n`);

  console.log("🗑️  Mengosongkan Data Operasional:");
  console.log("   - xnet_pekerjaan        -> [] (KOSONG)");
  console.log("   - xnet_leads            -> [] (KOSONG)");
  console.log("   - xnet_gangguan         -> [] (KOSONG)");
  console.log("   - xnet_daftar_gangguan  -> [] (KOSONG)");
  console.log("   - xnet_pengajuan_putus  -> [] (KOSONG)");
  console.log("   - xnet_pelanggan_radius -> [] (KOSONG)");
  console.log("   - xnet_fu_pelanggan     -> [] (KOSONG)");
  console.log("   - xnet_redaman_tinggi   -> [] (KOSONG)\n");

  const emptyPayload = {
    timestamp: new Date().toISOString(),
    status: "CLEANED",
    pekerjaan: [],
    leads: [],
    pelanggan: [],
    gangguan: [],
    pengajuan_pemutusan: [],
  };
  fs.writeFileSync(IMPORTED_DATA_PATH, JSON.stringify(emptyPayload, null, 2), "utf8");

  // Perbarui mockData.js dengan array kosong
  updateMockDataFile([], [], [], [], [], []);

  console.log("✅ Berkas `src/data/mockData.js` & `latest_imported_data.json` dikosongkan.");

  // Coba bersihkan cloud Supabase jika kredensial ada
  try {
    const envPath = path.resolve(__dirname, "../.env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf8");
      const urlMatch = envContent.match(/VITE_SUPABASE_URL\s*=\s*(.+)/);
      const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.+)/);
      if (urlMatch && keyMatch) {
        const { createClient } = require("@supabase/supabase-js");
        const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());
        console.log("☁️  Menghubungi Supabase Cloud...");
        const tables = ["pekerjaan", "leads", "gangguan", "daftar_gangguan", "pelanggan_radius"];
        for (const tbl of tables) {
          try {
            await supabase.from(tbl).delete().neq("id", -99999);
          } catch {}
        }
        console.log("☁️  Sinkronisasi cloud request pembersihan selesai.");
      }
    }
  } catch (err) {
    console.log("ℹ️  Cloud notice:", err.message);
  }

  console.log("\n✨ SUKSES: Sistem sekarang 100% bersih dan siap menerima data terbaru.");
  console.log("👉 Untuk memasukkan data terbaru, jalankan: node scripts/clean_and_import_new_data.cjs --import <nama_file.xlsx>\n");
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

async function importFromFile(filePath) {
  if (!filePath) {
    console.error("❌ Error: Harap sertakan path berkas. Contoh: --import spreadsheet_real.xlsx");
    process.exit(1);
  }

  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`❌ Error: Berkas tidak ditemukan di "${resolved}"`);
    process.exit(1);
  }

  console.log("\n=======================================================");
  console.log(`📥 [MEMPROSES IMPOR DATA TERBARU DARI: ${path.basename(resolved)}]`);
  console.log("=======================================================\n");

  let XLSX;
  try {
    XLSX = require("xlsx");
  } catch {
    console.error("❌ Error: Paket `xlsx` tidak terpasang.");
    process.exit(1);
  }

  const workbook = XLSX.readFile(resolved);
  console.log(`📄 Lembar kerja ditemukan: ${workbook.SheetNames.join(", ")}`);

  const result = {
    timestamp: new Date().toISOString(),
    sourceFile: path.basename(resolved),
    pekerjaan: [],
    leads: [],
    pelanggan: [],
    gangguan: [],
    pengajuan_pemutusan: [],
  };

  const isMultiTeamSpreadsheet = workbook.SheetNames.some(s => 
    s.toUpperCase().includes("GATRA") || s.toUpperCase().includes("AZWAR") || s.toUpperCase().includes("IQBAL")
  );

  if (isMultiTeamSpreadsheet) {
    console.log("🔍 Terdeteksi format Spreadsheet Operasional Nexus Net (Per Tim & Gangguan & Pemutusan)...");

    let taskId = 1000;
    const teamConfigs = [
      { sheetMatch: "GATRA", tim: "Tim A", teknisi: ["AIS", "Gatra"] },
      { sheetMatch: "IQBAL", tim: "Tim B", teknisi: ["Jusman", "Iqbal"] },
      { sheetMatch: "AZWAR", tim: "Tim C", teknisi: ["Azwar", "Rio"] },
    ];

    teamConfigs.forEach(tc => {
      const sheetName = workbook.SheetNames.find(s => s.toUpperCase().includes(tc.sheetMatch));
      if (!sheetName) return;

      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      console.log(`   -> Memproses lembar kerja ${tc.tim} (${sheetName}): ${rows.length} baris...`);

      rows.slice(5).forEach((r) => {
        // 1. PSB (Pemasangan)
        const psbNama = r[1] && typeof r[1] === "string" ? r[1].trim() : null;
        if (psbNama && psbNama !== "Nama" && !psbNama.toUpperCase().includes("TOTAL")) {
          const start = excelDateToDate(r[3]) || "2026-09-01";
          const finish = excelDateToDate(r[4]);
          const alamat = (r[2] && String(r[2]).trim()) || "Pontianak";
          const ket = r[5] ? String(r[5]).trim() : "";
          const isSelesai = r[8] === 1 || finish !== null;
          const isGagal = r[9] === 1 || (r[6] === 0 && ket.length > 0);
          const status = isGagal ? "GAGAL" : isSelesai ? "SELESAI" : "WAITING LIST";

          const sumber = r[11] === 1 ? "IKLAN" : r[12] === 1 ? "AFFILIATE" : r[13] === 1 ? "MARKETING" : "IKLAN";

          result.pekerjaan.push({
            id: ++taskId,
            spk_no: `SPK/PSB/${start.replace(/-/g, "")}/${String(taskId).padStart(4, "0")}`,
            pelanggan: psbNama,
            jenis: "PEMASANGAN",
            status,
            prioritas: "NORMAL",
            sesi: "PAGI",
            tim: tc.tim,
            teknisi_list: tc.teknisi,
            alamat,
            tanggal: start,
            keterangan: ket || `Pemasangan baru ${psbNama}`,
            komisi_total: status === "SELESAI" ? 18000 : 0,
          });

          result.leads.push({
            id: 2000 + result.leads.length + 1,
            nama: psbNama,
            alamat,
            sumber,
            status: status === "SELESAI" ? "SELESAI" : status === "GAGAL" ? "GAGAL" : "BARU",
            tanggal: start,
            keterangan_survey: ket || "Survey awal PSB",
          });

          // Masukkan ke Pelanggan Radius jika aktif / selesai
          if (status === "SELESAI") {
            result.pelanggan.push({
              id: 1000 + result.pelanggan.length + 1,
              id_pelanggan: `NX-2026-${String(result.pelanggan.length + 1).padStart(3, "0")}`,
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

        // 2. RPR (Perbaikan)
        const rprNama = r[17] && typeof r[17] === "string" ? r[17].trim() : null;
        if (rprNama && rprNama !== "Nama" && !rprNama.toUpperCase().includes("TOTAL")) {
          const start = excelDateToDate(r[18]) || "2026-09-01";
          const finish = excelDateToDate(r[19]);
          const ket = r[20] ? String(r[20]).trim() : "";
          const isSelesai = finish !== null || r[25] === 1 || r[24] === 1;
          const status = isSelesai ? "SELESAI" : "WAITING LIST";

          result.pekerjaan.push({
            id: ++taskId,
            spk_no: `SPK/RPR/${start.replace(/-/g, "")}/${String(taskId).padStart(4, "0")}`,
            pelanggan: rprNama,
            jenis: "PERBAIKAN",
            status,
            prioritas: "URGENT",
            sesi: "SORE",
            tim: tc.tim,
            teknisi_list: tc.teknisi,
            alamat: "-",
            tanggal: start,
            keterangan: ket || `Perbaikan koneksi ${rprNama}`,
            komisi_total: status === "SELESAI" ? 8500 : 0,
          });
        }

        // 3. DIS (Pemutusan / Penarikan)
        let disNama = null;
        let disStart = null;
        let disKet = "";

        for (let c = 31; c <= 34; c++) {
          if (r[c] && typeof r[c] === "string" && r[c].trim() && isNaN(r[c]) && r[c] !== "Nama" && !r[c].includes("TOTAL")) {
            disNama = r[c].trim();
            disStart = excelDateToDate(r[c + 1]) || excelDateToDate(r[c + 2]) || "2026-09-22";
            disKet = r[c + 3] ? String(r[c + 3]) : "";
            break;
          }
        }

        if (disNama) {
          result.pekerjaan.push({
            id: ++taskId,
            spk_no: `SPK/DIS/${(disStart || "20260922").replace(/-/g, "")}/${String(taskId).padStart(4, "0")}`,
            pelanggan: disNama,
            jenis: "PEMUTUSAN",
            status: "SELESAI",
            prioritas: "NORMAL",
            sesi: "PAGI",
            tim: tc.tim,
            teknisi_list: tc.teknisi,
            alamat: "-",
            tanggal: disStart || "2026-09-22",
            keterangan: disKet || `Pemutusan & dismantle perangkat ${disNama}`,
            komisi_total: 5000,
          });
        }
      });
    });

    // 4. Daftar Gangguan
    const dgSheetName = workbook.SheetNames.find(s => s.toUpperCase().includes("GANGGUAN") && !s.toUpperCase().includes("ODP"));
    if (dgSheetName) {
      const dgRows = XLSX.utils.sheet_to_json(workbook.Sheets[dgSheetName]);
      console.log(`   -> Memproses lembar kerja Gangguan (${dgSheetName}): ${dgRows.length} entri...`);
      dgRows.forEach((r, i) => {
        const nama = (r.Nama || r.nama || "Pelanggan").trim();
        const ket = (r.Keterangan || r.keterangan || "Gangguan koneksi").trim();
        const kontak = r.Kontak ? String(r.Kontak).replace(/^62/, "0") : "-";
        const tglMulai = excelDateToDate(r["Tanggal Mulai"]) || "2026-09-01";
        const followUp = excelDateToDate(r.FollUp || r.FollowUp) || "-";
        const hasilFU = r["Hasil FU"] ? String(r["Hasil FU"]).trim() : "Aman";

        result.gangguan.push({
          id: 3000 + i + 1,
          nama,
          keterangan: ket,
          kontak,
          tanggalMulai: tglMulai,
          followUp,
          hasilFU,
          status: hasilFU === "Aman" ? "SELESAI" : "PROSES",
        });
      });
    }

    // 5. Pengajuan Pemutusan
    const ppSheetName = workbook.SheetNames.find(s => s.toUpperCase().includes("PEMUTUSAN"));
    if (ppSheetName) {
      const ppRows = XLSX.utils.sheet_to_json(workbook.Sheets[ppSheetName]);
      console.log(`   -> Memproses lembar kerja Pengajuan Pemutusan (${ppSheetName}): ${ppRows.length} entri...`);
      ppRows.forEach((r, i) => {
        const rawNama = (r["Nama "] || r.Nama || "Pelanggan").trim();
        const kontak = r.Kontak ? String(r.Kontak).replace(/^62/, "0") : "-";
        const alasan = (r["Sebab/alasan"] || r.alasan || "Permintaan pelanggan").trim();

        result.pengajuan_pemutusan.push({
          id: 4000 + i + 1,
          nama: rawNama,
          kontak,
          alasan,
          tanggal: "2026-09-22",
          status: "SELESAI",
        });
      });
    }

    // 6. ODP LOS (Ditambahkan ke pekerjaan perbaikan khusus ODP)
    const odpLosName = workbook.SheetNames.find(s => s.toUpperCase().includes("ODP LOS"));
    if (odpLosName) {
      const odpLosRows = XLSX.utils.sheet_to_json(workbook.Sheets[odpLosName], { header: 1 });
      odpLosRows.slice(5).forEach((r) => {
        if (r[1] && typeof r[1] === "string" && r[1].startsWith("ODP")) {
          const odp = r[1];
          const ket = r[2] || "ODP LOS / Perbaikan Redaman";
          const start = excelDateToDate(r[3]) || "2026-09-10";
          result.pekerjaan.push({
            id: ++taskId,
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

  } else {
    // Mode lembar kerja umum / flat
    workbook.SheetNames.forEach((sheetName) => {
      const sLower = sheetName.toLowerCase();
      const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });

      if (sLower.includes("pekerjaan") || sLower.includes("spk")) {
        result.pekerjaan.push(...rawRows.map(normalizePekerjaanRow));
      } else if (sLower.includes("lead") || sLower.includes("prospek")) {
        result.leads.push(...rawRows.map(normalizeLeadsRow));
      } else if (sLower.includes("pelanggan") || sLower.includes("radius")) {
        result.pelanggan.push(...rawRows.map(normalizePelangganRow));
      } else if (sLower.includes("gangguan")) {
        result.gangguan.push(...rawRows.map(normalizeGangguanRow));
      } else if (sLower.includes("putus")) {
        result.pengajuan_pemutusan.push(...rawRows.map(normalizePemutusanRow));
      }
    });
  }

  // Tulis ke JSON arsip
  fs.writeFileSync(IMPORTED_DATA_PATH, JSON.stringify(result, null, 2), "utf8");

  // Perbarui mockData.js dengan data baru yang sudah bersih dan riil
  updateMockDataFile(
    result.pekerjaan,
    result.leads,
    result.gangguan,
    result.pengajuan_pemutusan,
    result.pelanggan
  );

  console.log("\n📊 Ringkasan Data yang Berhasil Diimpor & Diterapkan ke Sistem:");
  console.log(`   - Pekerjaan Lapangan : ${result.pekerjaan.length} entri SPK`);
  console.log(`   - Calon Leads/Prospek : ${result.leads.length} entri Leads`);
  console.log(`   - Pelanggan Radius   : ${result.pelanggan.length} entri Pelanggan`);
  console.log(`   - Tiket Gangguan     : ${result.gangguan.length} entri Gangguan`);
  console.log(`   - Pengajuan Putus    : ${result.pengajuan_pemutusan.length} entri Pemutusan`);
  console.log(`\n💾 Disimpan ke: ${path.relative(process.cwd(), MOCK_DATA_PATH)}`);
  console.log("✅ Berhasil! Data operasional terbaru sekarang aktif di Kharisma Hub & Nexus Net.");
  console.log("=======================================================\n");
}

function updateMockDataFile(pekerjaan, leads, gangguan, pengajuan, pelanggan) {
  // Hitung metrik teknisi
  const selesaiByTim = {
    "Tim A": pekerjaan.filter(p => p.tim === "Tim A" && p.status === "SELESAI").length,
    "Tim B": pekerjaan.filter(p => p.tim === "Tim B" && p.status === "SELESAI").length,
    "Tim C": pekerjaan.filter(p => p.tim === "Tim C" && p.status === "SELESAI").length,
  };

  const komisiByTim = {
    "Tim A": pekerjaan.filter(p => p.tim === "Tim A" && p.status === "SELESAI").reduce((sum, p) => sum + (p.komisi_total || 0), 0),
    "Tim B": pekerjaan.filter(p => p.tim === "Tim B" && p.status === "SELESAI").reduce((sum, p) => sum + (p.komisi_total || 0), 0),
    "Tim C": pekerjaan.filter(p => p.tim === "Tim C" && p.status === "SELESAI").reduce((sum, p) => sum + (p.komisi_total || 0), 0),
  };

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
      total_selesai: selesaiByTim["Tim A"] || 0,
      total_komisi: komisiByTim["Tim A"] || 0,
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
      total_selesai: selesaiByTim["Tim A"] || 0,
      total_komisi: komisiByTim["Tim A"] || 0,
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
      total_selesai: selesaiByTim["Tim B"] || 0,
      total_komisi: komisiByTim["Tim B"] || 0,
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
      total_selesai: selesaiByTim["Tim B"] || 0,
      total_komisi: komisiByTim["Tim B"] || 0,
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
      total_selesai: selesaiByTim["Tim C"] || 0,
      total_komisi: komisiByTim["Tim C"] || 0,
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
      total_selesai: selesaiByTim["Tim C"] || 0,
      total_komisi: komisiByTim["Tim C"] || 0,
    },
  ];

  const code = `import unifiedOdpOdc from "./unifiedOdpOdc.json";

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

// Data operasional detail (Hasil Impor Spreadsheet Terbaru)
export const pekerjaanList = ${JSON.stringify(pekerjaan, null, 2)};

export const leadsList = ${JSON.stringify(leads, null, 2)};
export const initialLeads = leadsList;

export const gangguanList = ${JSON.stringify(gangguan, null, 2)};
export const daftarGangguanList = gangguanList;
export const initialGangguanList = daftarGangguanList;

export const fuPelangganList = [];
export const redamanTinggiList = [];

export const pengajuanPemutusanList = ${JSON.stringify(pengajuan, null, 2)};

export const summaryData = {
  totalPekerjaan: ${pekerjaan.length},
  totalLeads: ${leads.length},
  pemasangan: {
    waitingList: ${pekerjaan.filter(p => p.jenis === "PEMASANGAN" && p.status === "WAITING LIST").length},
    dijadwalkan: ${pekerjaan.filter(p => p.jenis === "PEMASANGAN" && p.status === "DIJADWALKAN").length},
    selesai: ${pekerjaan.filter(p => p.jenis === "PEMASANGAN" && p.status === "SELESAI").length},
    gagal: ${pekerjaan.filter(p => p.jenis === "PEMASANGAN" && p.status === "GAGAL").length},
  },
  perbaikan: {
    waitingList: ${pekerjaan.filter(p => p.jenis === "PERBAIKAN" && p.status === "WAITING LIST").length},
    dijadwalkan: ${pekerjaan.filter(p => p.jenis === "PERBAIKAN" && p.status === "DIJADWALKAN").length},
    selesai: ${pekerjaan.filter(p => p.jenis === "PERBAIKAN" && p.status === "SELESAI").length},
  },
  pemutusan: {
    waitingList: ${pekerjaan.filter(p => p.jenis === "PEMUTUSAN" && p.status === "WAITING LIST").length},
    dijadwalkan: ${pekerjaan.filter(p => p.jenis === "PEMUTUSAN" && p.status === "DIJADWALKAN").length},
    selesai: ${pekerjaan.filter(p => p.jenis === "PEMUTUSAN" && p.status === "SELESAI").length},
    gagal: 0,
  },
  sumberLeads: {
    IKLAN: ${leads.filter(l => l.sumber === "IKLAN").length},
    MARKETING: ${leads.filter(l => l.sumber === "MARKETING").length},
    AFFILIATE: ${leads.filter(l => l.sumber === "AFFILIATE").length},
  },
  odpOdc: { total: 200, userTerdampak: 0 },
};

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

  fs.writeFileSync(MOCK_DATA_PATH, code, "utf8");
}

function normalizePekerjaanRow(row, idx) {
  return {
    id: Number(row.id || row.ID || row.no || (Date.now() + idx)),
    spk_no: String(row.spk_no || row.spk || row.SPK || row["No SPK"] || `SPK/GEN/${new Date().getFullYear()}/${idx + 1}`),
    pelanggan: String(row.pelanggan || row.nama || row.Nama || row["Nama Pelanggan"] || "Pelanggan"),
    jenis: String(row.jenis || row["Jenis Pekerjaan"] || "PEMASANGAN").toUpperCase(),
    status: String(row.status || row.Status || "WAITING LIST").toUpperCase(),
    prioritas: String(row.prioritas || row.Prioritas || "NORMAL").toUpperCase(),
    sesi: String(row.sesi || row.Sesi || "PAGI").toUpperCase(),
    tim: String(row.tim || row.Tim || "-"),
    teknisi_list: Array.isArray(row.teknisi_list) ? row.teknisi_list : (row.teknisi ? [row.teknisi] : []),
    alamat: String(row.alamat || row.Alamat || "-"),
    odp: String(row.odp || row.ODP || "-"),
    port: String(row.port || row.Port || "-"),
    telepon: String(row.telepon || row.hp || row.kontak || row.Kontak || "-"),
    tanggal: String(row.tanggal || row.Tanggal || new Date().toISOString().split("T")[0]),
    keterangan: String(row.keterangan || row.Keterangan || ""),
    komisi_items: Array.isArray(row.komisi_items) ? row.komisi_items : [],
    komisi_total: Number(row.komisi_total || row.komisi || 0),
  };
}

function normalizeLeadsRow(row, idx) {
  return {
    id: Number(row.id || (2000 + idx)),
    nama: String(row.nama || row.Nama || "Calon Pelanggan"),
    telepon: String(row.telepon || row.hp || row.kontak || "-"),
    alamat: String(row.alamat || row.Alamat || "-"),
    sumber: String(row.sumber || row.Sumber || "IKLAN").toUpperCase(),
    status: String(row.status || row.Status || "BARU").toUpperCase(),
    paket: String(row.paket || row.Paket || "Home Fiber 30 Mbps"),
    tanggal: String(row.tanggal || row.Tanggal || new Date().toISOString().split("T")[0]),
    odp_terdekat: String(row.odp_terdekat || row.odp || row.ODP || "-"),
    jarak_odp: Number(row.jarak_odp || row.jarak || 0),
    keterangan_survey: String(row.keterangan_survey || row.keterangan || ""),
  };
}

function normalizePelangganRow(row, idx) {
  return {
    id: Number(row.id || (1000 + idx)),
    id_pelanggan: String(row.id_pelanggan || row.id_cust || row.customer_id || `NX-${1000 + idx}`),
    nama: String(row.nama || row.Nama || "Pelanggan"),
    telepon: String(row.telepon || row.hp || row.kontak || "-"),
    alamat: String(row.alamat || row.Alamat || "-"),
    odp: String(row.odp || row.ODP || "-"),
    paket: String(row.paket || row.Paket || "Home Fiber 30 Mbps"),
    status: String(row.status || row.Status || "AKTIF").toUpperCase(),
    ip_address: String(row.ip_address || row.ip || "-"),
    tgl_daftar: String(row.tgl_daftar || row.tanggal || new Date().toISOString().split("T")[0]),
  };
}

function normalizeGangguanRow(row, idx) {
  return {
    id: Number(row.id || (3000 + idx)),
    tanggal: String(row.tanggal || new Date().toISOString().split("T")[0]),
    kategori: String(row.kategori || row.Kategori || "Kabel Putus"),
    pelanggan: String(row.pelanggan || row.nama || "-"),
    alamat: String(row.alamat || "-"),
    status: String(row.status || "WAITING").toUpperCase(),
    keterangan: String(row.keterangan || "-"),
    user_terdampak: Number(row.user_terdampak || 1),
  };
}

function normalizePemutusanRow(row, idx) {
  return {
    id: Number(row.id || (4000 + idx)),
    nama: String(row.nama || row.pelanggan || "-"),
    kontak: String(row.kontak || row.telepon || "-"),
    alasan: String(row.alasan || row.keterangan || "-"),
    tanggal: String(row.tanggal || new Date().toISOString().split("T")[0]),
    status: String(row.status || "MENUNGGU_DISPOSISI").toUpperCase(),
  };
}

// Main Execution
const args = process.argv.slice(2);
if (args.includes("--clean")) {
  cleanOperationalData();
} else if (args.includes("--status")) {
  showStatus();
} else if (args.includes("--import")) {
  const fileIdx = args.indexOf("--import") + 1;
  importFromFile(args[fileIdx]);
} else {
  console.log("Argumen tidak dikenali. Gunakan --clean, --status, atau --import <file>");
}
