// Mesin Perhitungan Payroll, Gaji Pokok, Tunjangan, Potongan & Slip Gaji Teknisi Nexus Net
import { calculateTeamIncentives, formatRupiah, DEFAULT_INCENTIVE_CONFIG, KOMISI_PEKERJAAN_MASTER } from "./incentives.js";

export const STORAGE_KEY_PAYROLL_CONFIG = "xnet_payroll_config";
export const STORAGE_KEY_PERSONIL_PAYROLL_CONFIG = "xnet_personil_payroll_config";
export const STORAGE_KEY_PAYROLL_RECORDS = "xnet_payroll_records";

// Skema Penggajian
export const SKEMA_GAJI = [
  { id: "KOMISI_MURNI", label: "Murni Komisi (Freelance / Mitra)", desc: "100% pendapatan berbasis komisi pekerjaan fisik" },
  { id: "TETAP_KOMISI", label: "Gaji Pokok + Komisi (Karyawan Tetap)", desc: "Gaji pokok bulanan ditambah komisi pekerjaan & bonus" },
  { id: "HARIAN_KOMISI", label: "Uang Harian + Komisi (Kontrak)", desc: "Uang kehadiran harian ditambah komisi pekerjaan & bonus" },
];

// Master Profil Finansial & Penggajian Personal Perorangan Teknisi
export const DEFAULT_PERSONIL_SALARY_PROFILES = {
  "AIS": {
    id: 1,
    nama: "Ais Maulana",
    panggilan: "AIS",
    nik: "TKN-001",
    timId: 1,
    timNama: "Tim A",
    peran: "Installer / Field Tech",
    skema: "TETAP_KOMISI",
    gajiPokok: 2500000,
    uangHarian: 0,
    hariKerja: 26,
    tunjanganMakan: 300000,
    tunjanganTransport: 250000,
    tunjanganKomunikasi: 100000,
    potonganKasbon: 0,
    potonganBpjs: 50000,
    potonganLain: 0,
    rekeningBank: "BCA - 8450192831",
    atasNama: "Ais Maulana",
    nomorWa: "6281234567890",
  },
  "GATRA": {
    id: 2,
    nama: "Gatra Wicaksono",
    panggilan: "Gatra",
    nik: "TKN-002",
    timId: 1,
    timNama: "Tim A",
    peran: "Splicer / Fiber Specialist",
    skema: "TETAP_KOMISI",
    gajiPokok: 2500000,
    uangHarian: 0,
    hariKerja: 26,
    tunjanganMakan: 300000,
    tunjanganTransport: 250000,
    tunjanganKomunikasi: 100000,
    potonganKasbon: 0,
    potonganBpjs: 50000,
    potonganLain: 0,
    rekeningBank: "BCA - 8450192832",
    atasNama: "Gatra Wicaksono",
    nomorWa: "6281234567891",
  },
  "JUSMAN": {
    id: 3,
    nama: "Jusman",
    panggilan: "Jusman",
    nik: "TKN-003",
    timId: 2,
    timNama: "Tim B",
    peran: "Team Leader / Field Tech",
    skema: "TETAP_KOMISI",
    gajiPokok: 2700000,
    uangHarian: 0,
    hariKerja: 26,
    tunjanganMakan: 300000,
    tunjanganTransport: 250000,
    tunjanganKomunikasi: 100000,
    potonganKasbon: 0,
    potonganBpjs: 50000,
    potonganLain: 0,
    rekeningBank: "Mandiri - 146001298374",
    atasNama: "Jusman",
    nomorWa: "6281298765432",
  },
  "IQBAL": {
    id: 4,
    nama: "Iqbal Ramadhan",
    panggilan: "Iqbal",
    nik: "TKN-004",
    timId: 2,
    timNama: "Tim B",
    peran: "Installer / Field Tech",
    skema: "TETAP_KOMISI",
    gajiPokok: 2500000,
    uangHarian: 0,
    hariKerja: 26,
    tunjanganMakan: 300000,
    tunjanganTransport: 250000,
    tunjanganKomunikasi: 100000,
    potonganKasbon: 0,
    potonganBpjs: 50000,
    potonganLain: 0,
    rekeningBank: "BRI - 012901827461",
    atasNama: "Iqbal Ramadhan",
    nomorWa: "6281298765433",
  },
  "AZWAR": {
    id: 5,
    nama: "Azwar",
    panggilan: "Azwar",
    nik: "TKN-005",
    timId: 3,
    timNama: "Tim C",
    peran: "Specialist ODP/ODC",
    skema: "TETAP_KOMISI",
    gajiPokok: 2600000,
    uangHarian: 0,
    hariKerja: 26,
    tunjanganMakan: 300000,
    tunjanganTransport: 250000,
    tunjanganKomunikasi: 100000,
    potonganKasbon: 0,
    potonganBpjs: 50000,
    potonganLain: 0,
    rekeningBank: "BNI - 0981273645",
    atasNama: "Azwar",
    nomorWa: "628125556677",
  },
  "RIO": {
    id: 6,
    nama: "Rio Saputra",
    panggilan: "Rio",
    nik: "TKN-006",
    timId: 3,
    timNama: "Tim C",
    peran: "Field Technician",
    skema: "TETAP_KOMISI",
    gajiPokok: 2500000,
    uangHarian: 0,
    hariKerja: 26,
    tunjanganMakan: 300000,
    tunjanganTransport: 250000,
    tunjanganKomunikasi: 100000,
    potonganKasbon: 0,
    potonganBpjs: 50000,
    potonganLain: 0,
    rekeningBank: "BCA - 8450192839",
    atasNama: "Rio Saputra",
    nomorWa: "628125556678",
  },
  "DEFAULT": {
    id: 0,
    nama: "Teknisi Nexus",
    panggilan: "TEKNISI",
    nik: "TKN-000",
    timId: 1,
    timNama: "Tim Lapangan",
    peran: "Field Technician",
    skema: "KOMISI_MURNI",
    gajiPokok: 0,
    uangHarian: 80000,
    hariKerja: 25,
    tunjanganMakan: 0,
    tunjanganTransport: 150000,
    tunjanganKomunikasi: 50000,
    potonganKasbon: 0,
    potonganBpjs: 0,
    potonganLain: 0,
    rekeningBank: "-",
    atasNama: "-",
    nomorWa: "",
  },
};

// Default Konfigurasi Gaji per Tim (Legacy / Group)
export const DEFAULT_TEAM_SALARY_PROFILES = {
  "GATRA - AIS": {
    skema: "TETAP_KOMISI",
    gajiPokok: 2500000,
    uangHarian: 0,
    hariKerja: 26,
    tunjanganMakan: 300000,
    tunjanganTransport: 250000,
    tunjanganKomunikasi: 100000,
    potonganKasbon: 0,
    potonganBpjs: 50000,
    potonganLain: 0,
    rekeningBank: "BCA - 8450192831",
    atasNama: "Ais Maulana",
    nomorWa: "6281234567890",
  },
  "PUTRA - FAISAL": {
    skema: "TETAP_KOMISI",
    gajiPokok: 2500000,
    uangHarian: 0,
    hariKerja: 26,
    tunjanganMakan: 300000,
    tunjanganTransport: 250000,
    tunjanganKomunikasi: 100000,
    potonganKasbon: 0,
    potonganBpjs: 50000,
    potonganLain: 0,
    rekeningBank: "Mandiri - 137001928374",
    atasNama: "Putra Pratama",
    nomorWa: "6281298765432",
  },
  "DEFAULT": {
    skema: "KOMISI_MURNI",
    gajiPokok: 0,
    uangHarian: 80000,
    hariKerja: 25,
    tunjanganMakan: 0,
    tunjanganTransport: 150000,
    tunjanganKomunikasi: 50000,
    potonganKasbon: 0,
    potonganBpjs: 0,
    potonganLain: 0,
    rekeningBank: "-",
    atasNama: "-",
    nomorWa: "",
  },
};

// Ambil profil gaji personal tersimpan atau default
export function getPersonilSalaryProfiles() {
  if (typeof localStorage === "undefined") return DEFAULT_PERSONIL_SALARY_PROFILES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PERSONIL_PAYROLL_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_PERSONIL_SALARY_PROFILES, ...parsed };
    }
  } catch (e) {
    console.warn("Gagal membaca personil payroll config:", e);
  }
  return DEFAULT_PERSONIL_SALARY_PROFILES;
}

// Simpan profil gaji personal
export function savePersonilSalaryProfiles(profiles) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_PERSONIL_PAYROLL_CONFIG, JSON.stringify(profiles));
  } catch (e) {
    console.error("Gagal menyimpan personil payroll config:", e);
  }
}

// Ambil profil gaji tim tersimpan atau default
export function getTeamSalaryProfiles() {
  if (typeof localStorage === "undefined") return DEFAULT_TEAM_SALARY_PROFILES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAYROLL_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_TEAM_SALARY_PROFILES, ...parsed };
    }
  } catch (e) {
    console.warn("Gagal membaca payroll config:", e);
  }
  return DEFAULT_TEAM_SALARY_PROFILES;
}

// Simpan profil gaji tim
export function saveTeamSalaryProfiles(profiles) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_PAYROLL_CONFIG, JSON.stringify(profiles));
  } catch (e) {
    console.error("Gagal menyimpan payroll config:", e);
  }
}

// Hitung total penerimaan, potongan, dan Take Home Pay (Gaji Bersih) untuk 1 tim
export function calculateTeamPayroll({
  timNama,
  tasks = [],
  profile = null,
  periodLabel = "Bulan Ini",
  config = DEFAULT_INCENTIVE_CONFIG,
  masterList = KOMISI_PEKERJAAN_MASTER,
}) {
  const allProfiles = getTeamSalaryProfiles();
  const salProfile = profile || allProfiles[timNama] || allProfiles["DEFAULT"] || {
    skema: "KOMISI_MURNI",
    gajiPokok: 0,
    uangHarian: 0,
    hariKerja: 0,
    tunjanganMakan: 0,
    tunjanganTransport: 0,
    tunjanganKomunikasi: 0,
    potonganKasbon: 0,
    potonganBpjs: 0,
    potonganLain: 0,
  };

  // 1. Hitung Komisi Tugas Lapangan
  const teamIncentives = calculateTeamIncentives(tasks, timNama, config, masterList);
  const totalKomisiTugas = teamIncentives.totalBaseFee;
  const totalBonusKualitas = teamIncentives.totalQualityBonus;
  const bonusTarget = teamIncentives.activeTierBonus;

  // 2. Hitung Komponen Gaji Pokok
  let gajiPokokDihitung = 0;
  if (salProfile.skema === "TETAP_KOMISI") {
    gajiPokokDihitung = Number(salProfile.gajiPokok) || 0;
  } else if (salProfile.skema === "HARIAN_KOMISI") {
    const harian = Number(salProfile.uangHarian) || 0;
    const hari = Number(salProfile.hariKerja) || 0;
    gajiPokokDihitung = harian * hari;
  } else {
    // KOMISI_MURNI
    gajiPokokDihitung = 0;
  }

  // 3. Tunjangan
  const tunjanganMakan = Number(salProfile.tunjanganMakan) || 0;
  const tunjanganTransport = Number(salProfile.tunjanganTransport) || 0;
  const tunjanganKomunikasi = Number(salProfile.tunjanganKomunikasi) || 0;
  const totalTunjangan = tunjanganMakan + tunjanganTransport + tunjanganKomunikasi;

  // 4. Penghasilan Bruto (Kotor)
  const totalPenghasilanKotor =
    gajiPokokDihitung +
    totalTunjangan +
    totalKomisiTugas +
    totalBonusKualitas +
    bonusTarget;

  // 5. Potongan
  const potonganKasbon = Number(salProfile.potonganKasbon) || 0;
  const potonganBpjs = Number(salProfile.potonganBpjs) || 0;
  const potonganLain = Number(salProfile.potonganLain) || 0;
  const totalPotongan = potonganKasbon + potonganBpjs + potonganLain;

  // 6. Gaji Bersih (Take Home Pay)
  const takeHomePay = Math.max(0, totalPenghasilanKotor - totalPotongan);

  // Buat nomor slip gaji unik
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const cleanTeamCode = (timNama || "TEAM").replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();
  const slipNumber = `SLIP/${cleanTeamCode}/${yearMonth}/${String(Math.floor(1000 + Math.random() * 9000))}`;

  return {
    timNama,
    periodLabel,
    slipNumber,
    skema: salProfile.skema,
    rekeningBank: salProfile.rekeningBank || "-",
    atasNama: salProfile.atasNama || timNama,
    nomorWa: salProfile.nomorWa || "",
    // Penerimaan
    gajiPokok: gajiPokokDihitung,
    hariKerja: salProfile.hariKerja || 0,
    uangHarian: salProfile.uangHarian || 0,
    tunjanganMakan,
    tunjanganTransport,
    tunjanganKomunikasi,
    totalTunjangan,
    // Komisi Pekerjaan
    totalTugasSelesai: teamIncentives.totalCompleted,
    totalKomisiTugas,
    totalBonusKualitas,
    bonusTarget,
    targetTierLabel: teamIncentives.achievedTierLabel,
    itemKomisiRincian: teamIncentives.itemsAggregated || [],
    daftarTugas: teamIncentives.breakdown || [],
    // Akumulasi
    totalPenghasilanKotor,
    // Potongan
    potonganKasbon,
    potonganBpjs,
    potonganLain,
    totalPotongan,
    // Gaji Bersih
    takeHomePay,
  };
}

// Hitung total penerimaan, potongan, dan Take Home Pay (Gaji Bersih) untuk 1 personil teknisi individu
export function calculatePersonilPayroll({
  personil = null,
  tasks = [],
  profile = null,
  periodLabel = "Bulan Ini",
  config = DEFAULT_INCENTIVE_CONFIG,
  masterList = KOMISI_PEKERJAAN_MASTER,
}) {
  const allProfiles = getPersonilSalaryProfiles();
  const personilObj = typeof personil === "string" ? { panggilan: personil, nama: personil } : (personil || {});
  const pKey = (personilObj.panggilan || personilObj.nama || "").toUpperCase().trim();
  
  // Cari kecocokan profil berdasarkan panggilan (AIS, GATRA, dll) atau nama lengkap
  let matchedProfile = profile;
  if (!matchedProfile && pKey) {
    matchedProfile = allProfiles[pKey];
    if (!matchedProfile) {
      const foundEntry = Object.values(allProfiles).find(
        (p) =>
          (p.panggilan && p.panggilan.toUpperCase() === pKey) ||
          (p.nama && p.nama.toUpperCase().includes(pKey)) ||
          (pKey && p.nama && pKey.includes(p.panggilan.toUpperCase()))
      );
      if (foundEntry) matchedProfile = foundEntry;
    }
  }
  const salProfile = matchedProfile || allProfiles["DEFAULT"] || {
    skema: "KOMISI_MURNI",
    gajiPokok: 0,
    uangHarian: 0,
    hariKerja: 0,
    tunjanganMakan: 0,
    tunjanganTransport: 0,
    tunjanganKomunikasi: 0,
    potonganKasbon: 0,
    potonganBpjs: 0,
    potonganLain: 0,
  };

  // 1. Hitung Komisi Tugas Khusus untuk Personil Tersebut
  const searchKey = personilObj.panggilan || personilObj.nama || salProfile.panggilan || salProfile.nama || "AIS";
  const personilIncentives = calculateTeamIncentives(tasks, searchKey, config, masterList);
  const totalKomisiTugas = personilIncentives.totalBaseFee;
  const totalBonusKualitas = personilIncentives.totalQualityBonus;
  const bonusTarget = personilIncentives.activeTierBonus;

  // 2. Hitung Komponen Gaji Pokok
  let gajiPokokDihitung = 0;
  if (salProfile.skema === "TETAP_KOMISI") {
    gajiPokokDihitung = Number(salProfile.gajiPokok) || 0;
  } else if (salProfile.skema === "HARIAN_KOMISI") {
    const harian = Number(salProfile.uangHarian) || 0;
    const hari = Number(salProfile.hariKerja) || 0;
    gajiPokokDihitung = harian * hari;
  } else {
    gajiPokokDihitung = 0;
  }

  // 3. Tunjangan
  const tunjanganMakan = Number(salProfile.tunjanganMakan) || 0;
  const tunjanganTransport = Number(salProfile.tunjanganTransport) || 0;
  const tunjanganKomunikasi = Number(salProfile.tunjanganKomunikasi) || 0;
  const totalTunjangan = tunjanganMakan + tunjanganTransport + tunjanganKomunikasi;

  // 4. Penghasilan Bruto (Kotor)
  const totalPenghasilanKotor =
    gajiPokokDihitung +
    totalTunjangan +
    totalKomisiTugas +
    totalBonusKualitas +
    bonusTarget;

  // 5. Potongan
  const potonganKasbon = Number(salProfile.potonganKasbon) || 0;
  const potonganBpjs = Number(salProfile.potonganBpjs) || 0;
  const potonganLain = Number(salProfile.potonganLain) || 0;
  const totalPotongan = potonganKasbon + potonganBpjs + potonganLain;

  // 6. Gaji Bersih (Take Home Pay)
  const takeHomePay = Math.max(0, totalPenghasilanKotor - totalPotongan);

  // Buat nomor slip gaji unik
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const cleanCode = (salProfile.panggilan || personilObj.panggilan || "TKN").replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();
  const slipNumber = `SLIP/${cleanCode}/${yearMonth}/${String(Math.floor(1000 + Math.random() * 9000))}`;

  return {
    personilId: personilObj.id || salProfile.id,
    nik: salProfile.nik || `TKN-00${personilObj.id || 1}`,
    atasNama: salProfile.atasNama || personilObj.nama || salProfile.nama,
    panggilan: salProfile.panggilan || personilObj.panggilan,
    peran: salProfile.peran || personilObj.peran || "Teknisi Lapangan",
    timNama: personilObj.timNama || salProfile.timNama || "Tim A",
    periodLabel,
    slipNumber,
    skema: salProfile.skema,
    rekeningBank: salProfile.rekeningBank || "-",
    nomorWa: salProfile.nomorWa || personilObj.telepon || "",
    // Penerimaan
    gajiPokok: gajiPokokDihitung,
    hariKerja: salProfile.hariKerja || 0,
    uangHarian: salProfile.uangHarian || 0,
    tunjanganMakan,
    tunjanganTransport,
    tunjanganKomunikasi,
    totalTunjangan,
    // Komisi Pekerjaan
    totalTugasSelesai: personilIncentives.totalCompleted,
    totalKomisiTugas,
    totalBonusKualitas,
    bonusTarget,
    targetTierLabel: personilIncentives.achievedTierLabel,
    itemKomisiRincian: personilIncentives.itemsAggregated || [],
    daftarTugas: personilIncentives.breakdown || [],
    // Akumulasi
    totalPenghasilanKotor,
    // Potongan
    potonganKasbon,
    potonganBpjs,
    potonganLain,
    totalPotongan,
    // Gaji Bersih
    takeHomePay,
  };
}

// Konversi Angka ke Huruf Terbilang Rupiah
export function angkaTerbilang(angka) {
  const bilangan = [
    "", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas",
  ];
  const num = Math.floor(Math.abs(Number(angka) || 0));

  if (num < 12) return bilangan[num];
  if (num < 20) return angkaTerbilang(num - 10) + " Belas";
  if (num < 100) return angkaTerbilang(Math.floor(num / 10)) + " Puluh " + angkaTerbilang(num % 10);
  if (num < 200) return "Seratus " + angkaTerbilang(num - 100);
  if (num < 1000) return angkaTerbilang(Math.floor(num / 100)) + " Ratus " + angkaTerbilang(num % 100);
  if (num < 2000) return "Seribu " + angkaTerbilang(num - 1000);
  if (num < 1000000) return angkaTerbilang(Math.floor(num / 1000)) + " Ribu " + angkaTerbilang(num % 1000);
  if (num < 1000000000) return angkaTerbilang(Math.floor(num / 1000000)) + " Juta " + angkaTerbilang(num % 1000000);
  if (num < 1000000000000) return angkaTerbilang(Math.floor(num / 1000000000)) + " Milyar " + angkaTerbilang(num % 1000000000);
  return "";
}

export function terbilangRupiah(amount) {
  if (!amount || amount === 0) return "Nol Rupiah";
  const str = angkaTerbilang(amount).replace(/\s+/g, " ").trim();
  return str + " Rupiah";
}

// Format Teks Ringkasan Slip Gaji untuk WhatsApp
export function generateWhatsAppSlipMessage(payrollData) {
  const p = payrollData;
  return `*SLIP GAJI & KOMISI RESMI NEXUS NET*
━━━━━━━━━━━━━━━━━━━━
*No. Slip:* ${p.slipNumber}
*Penerima:* ${p.atasNama} ${p.nik ? `(${p.nik})` : ""}
*Jabatan:* ${p.peran || "Teknisi Lapangan"} • ${p.timNama}
*Periode:* ${p.periodLabel}
*Rekening:* ${p.rekeningBank}
━━━━━━━━━━━━━━━━━━━━
*PENERIMAAN:*
• Gaji Pokok: ${formatRupiah(p.gajiPokok)}
• Total Tunjangan: ${formatRupiah(p.totalTunjangan)}
• Komisi SPK (${p.totalTugasSelesai} tugas): ${formatRupiah(p.totalKomisiTugas)}
${p.bonusTarget > 0 ? `• Bonus Target (${p.targetTierLabel}): ${formatRupiah(p.bonusTarget)}\n` : ""}• *Total Penghasilan Kotor:* ${formatRupiah(p.totalPenghasilanKotor)}

*POTONGAN:*
${p.potonganKasbon > 0 ? `• Kasbon: -${formatRupiah(p.potonganKasbon)}\n` : ""}${p.potonganBpjs > 0 ? `• BPJS: -${formatRupiah(p.potonganBpjs)}\n` : ""}${p.potonganLain > 0 ? `• Lain-lain: -${formatRupiah(p.potonganLain)}\n` : ""}• *Total Potongan:* -${formatRupiah(p.totalPotongan)}
━━━━━━━━━━━━━━━━━━━━
*TAKE HOME PAY (GAJI BERSIH):*
*${formatRupiah(p.takeHomePay)}*
_(${terbilangRupiah(p.takeHomePay)})_
━━━━━━━━━━━━━━━━━━━━
_Dokumen ini dihasilkan secara otomatis oleh Nexus Net Management System._`;
}
