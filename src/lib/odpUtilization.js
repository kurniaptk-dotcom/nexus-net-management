/**
 * Utilitas Perhitungan Kapasitas & Penggunaan Port ODP Real-Time
 * Menghubungkan Master ODP/ODC dengan Data Pelanggan Radius Aktif
 */

/**
 * Normalisasi nama ODP untuk pencocokan toleran terhadap format penulisan
 * Contoh: "ODP 1.1", "ODP-1.1", "ODP.1.1", "odp 01.1" -> "ODP11"
 */
export function normalizeOdpName(name) {
  if (!name) return "";
  return String(name)
    .toUpperCase()
    .replace(/\bPORT\s*[-:#]?\s*\d+\b/gi, "")
    .replace(/\bP\s*[-:#]?\s*\d+\b/gi, "")
    .replace(/^ODP[-\s.]*/i, "ODP")
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

/**
 * Parsing kapasitas port dari string atau number
 * "8 Port" -> 8, "16 Port" -> 16, default 8
 */
export function parseTotalPort(val) {
  if (typeof val === "number" && !isNaN(val) && val > 0) return val;
  if (!val) return 8;
  const match = String(val).match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return num > 0 ? num : 8;
  }
  return 8;
}

/**
 * Hitung utilisasi port secara real-time berdasarkan data Pelanggan Radius
 * @param {Array} odpList - Daftar ODP dari xnet_odpodc / mockData
 * @param {Array} pelangganList - Daftar Pelanggan dari xnet_pelanggan_radius
 * @returns {Array} odpList yang sudah diperkaya metrik port terpakai, sisa, dan status
 */
export function enrichOdpWithPortUtilization(odpList = [], pelangganList = []) {
  if (!Array.isArray(odpList)) return [];

  // 1. Petakan jumlah pelanggan aktif per ODP
  const usageCount = {};
  const customerDetailMap = {};

  (pelangganList || []).forEach((cust) => {
    if (!cust) return;
    const st = (cust.status || "").toUpperCase();
    // Pelanggan NONAKTIF atau BERHENTI tidak lagi memakan port fisik
    if (st === "NONAKTIF" || st === "BERHENTI" || st === "PUTUS") return;

    if (!cust.odp) return;
    const key = normalizeOdpName(cust.odp);
    usageCount[key] = (usageCount[key] || 0) + 1;

    if (!customerDetailMap[key]) customerDetailMap[key] = [];
    customerDetailMap[key].push({
      id: cust.id || cust.id_pelanggan,
      id_pelanggan: cust.id_pelanggan,
      nama: cust.nama,
      paket: cust.paket,
      status: cust.status,
      alamat: cust.alamat,
      telepon: cust.telepon,
    });
  });

  // 2. Gabungkan ke data ODP
  return odpList.map((odp) => {
    if (!odp) return odp;
    const key = normalizeOdpName(odp.nama);
    const used = usageCount[key] || 0;
    const total = parseTotalPort(odp.port_kapasitas || odp.kapasitas);
    const remaining = Math.max(0, total - used);
    const isFull = remaining === 0;
    const isNearFull = remaining === 1;
    const percent = Math.min(100, Math.round((used / total) * 100));

    return {
      ...odp,
      port_kapasitas: total,
      port_terpakai: used,
      port_sisa: remaining,
      port_is_full: isFull,
      port_is_near_full: isNearFull,
      port_percent: percent,
      connected_customers: customerDetailMap[key] || [],
    };
  });
}

/**
 * Helper ringkasan statistik port seluruh jaringan
 */
export function calculateNetworkPortStats(enrichedOdps = []) {
  let totalKapasitas = 0;
  let totalTerpakai = 0;
  let odpPenuhCount = 0;
  let odpKritisCount = 0; // sisa 1 port
  let totalIsolirCount = 0;

  enrichedOdps.forEach((o) => {
    const kap = o.port_kapasitas || 8;
    const terp = o.port_terpakai || 0;
    totalKapasitas += kap;
    totalTerpakai += terp;
    if (o.port_is_full) odpPenuhCount++;
    else if (o.port_is_near_full) odpKritisCount++;

    if (Array.isArray(o.connected_customers)) {
      o.connected_customers.forEach((c) => {
        if (c.status === "ISOLIR") totalIsolirCount++;
      });
    }
  });

  const totalSisa = Math.max(0, totalKapasitas - totalTerpakai);
  const percentTotal = totalKapasitas > 0 ? Math.round((totalTerpakai / totalKapasitas) * 100) : 0;

  return {
    totalKapasitas,
    totalTerpakai,
    totalSisa,
    percentTotal,
    odpPenuhCount,
    odpKritisCount,
    totalIsolirCount,
  };
}
