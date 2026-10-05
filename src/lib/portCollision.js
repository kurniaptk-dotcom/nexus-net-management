import { normalizeOdpName, parseTotalPort } from "./odpUtilization.js";

/**
 * Ekstrak nomor port dari string penulisan bebas
 * Contoh: "ODP 1.1 Port 3" -> 3, "Port 2" -> 2, "ODP 1.2 - 4" -> 4, "P5" -> 5
 */
export function extractPortNumber(str) {
  if (!str) return null;
  // Prioritaskan kata 'port' eksplisit: "ODP 1.1 Port 3" -> 3
  const portMatch = String(str).match(/\bport\s*[-:#]?\s*(\d+)\b/i);
  if (portMatch && portMatch[1]) {
    const num = parseInt(portMatch[1], 10);
    return isNaN(num) ? null : num;
  }
  // Alternatif singkatan P: "P3", "P-3", atau akhiran "- 3"
  const altMatch = String(str).match(/\bP\s*[-:#]?\s*(\d+)\b/i) || String(str).match(/[-:#]\s*(\d+)$/);
  if (altMatch && altMatch[1]) {
    const num = parseInt(altMatch[1], 10);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Petakan seluruh port fisik pada ODP (Port 1 s/d N)
 * dan identifikasi port mana saja yang sedang dipakai pelanggan aktif vs masih kosong
 * 
 * @param {string} odpName - Nama ODP (misal "ODP 1.1")
 * @param {Array} odpList - Master ODP dari state / mockData
 * @param {Array} pelangganList - Daftar Pelanggan Radius
 * @returns {Array} List port dengan status bentrok/tersedia
 */
export function getOdpPortMap(odpName, odpList = [], pelangganList = []) {
  if (!odpName) return [];
  const normalizedTarget = normalizeOdpName(odpName);

  // 1. Cari kapasitas port ODP dari master
  const matchedOdp = (odpList || []).find((o) => normalizeOdpName(o.nama || o.odp) === normalizedTarget);
  const totalPorts = matchedOdp ? parseTotalPort(matchedOdp.port_kapasitas || matchedOdp.kapasitas) : 8;

  // 2. Ambil semua pelanggan aktif di ODP ini (abaikan status PUTUS)
  const activeCustomers = (pelangganList || []).filter((c) => {
    if (!c || !c.odp) return false;
    const st = (c.status || "").toUpperCase();
    if (st === "PUTUS" || st === "NONAKTIF" || st === "BERHENTI") return false;
    return normalizeOdpName(c.odp) === normalizedTarget;
  });

  // 3. Petakan pelanggan ke slot nomor port
  const portSlotMap = {};
  const unassignedCustomers = [];

  activeCustomers.forEach((cust) => {
    const portNum = extractPortNumber(cust.odp) || cust.port_number || cust.port;
    if (portNum && portNum >= 1 && portNum <= totalPorts && !portSlotMap[portNum]) {
      portSlotMap[portNum] = cust;
    } else {
      unassignedCustomers.push(cust);
    }
  });

  // Distribusikan pelanggan aktif yang belum memiliki penomoran port eksplisit
  let unassignedIndex = 0;
  for (let p = 1; p <= totalPorts; p++) {
    if (!portSlotMap[p] && unassignedIndex < unassignedCustomers.length) {
      portSlotMap[p] = unassignedCustomers[unassignedIndex];
      unassignedIndex++;
    }
  }

  // 4. Bangun array port 1 s/d totalPorts
  const result = [];
  for (let i = 1; i <= totalPorts; i++) {
    const occ = portSlotMap[i];
    result.push({
      portNumber: i,
      label: `Port ${i}`,
      isOccupied: Boolean(occ),
      customer: occ || null,
      customerName: occ?.nama || null,
      customerPackage: occ?.paket || null,
      customerStatus: occ?.status || null,
    });
  }

  return result;
}

/**
 * Validasi apakah nomor port yang dipilih bentrok dengan pelanggan lain
 * @returns {object} { isConflict: boolean, conflictingCustomer: string | null }
 */
export function checkPortCollision(odpName, portNumber, odpList = [], pelangganList = []) {
  if (!odpName || !portNumber) return { isConflict: false, conflictingCustomer: null };
  const portMap = getOdpPortMap(odpName, odpList, pelangganList);
  const target = portMap.find((p) => p.portNumber === Number(portNumber));

  if (target && target.isOccupied) {
    return {
      isConflict: true,
      conflictingCustomer: target.customerName || "Pelanggan Lain",
      customerPackage: target.customerPackage,
    };
  }

  return { isConflict: false, conflictingCustomer: null };
}
