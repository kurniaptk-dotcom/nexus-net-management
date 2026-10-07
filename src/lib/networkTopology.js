/**
 * networkTopology.js
 * Utilitas Analisis Topologi Jaringan FTTH & Pemetaan Geospasial End-to-End
 * Menghubungkan: Pusat (HQ/OLT) -> Kabel Feeder -> ODC -> Kabel Distribusi -> ODP -> Kabel Dropcore -> Rumah Pelanggan
 */

import { normalizeOdpName } from "./odpUtilization";

// Helper: Hitung jarak Haversine (meter)
export function getDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371e3; // meter
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Estimasi Redaman Optik Total (dBm) sepanjang jalur FTTH
 * Standar GPON:
 * - Redaman fiber optik G.652D: ~0.35 dB/km pada 1310nm / 0.25 dB/km pada 1490nm
 * - Insertion loss Splitter 1:4 (di ODC): ~7.2 dB
 * - Insertion loss Splitter 1:8 (di ODP): ~10.5 dB
 * - Splicing / sambungan mekanik / adaptor: ~0.1 dB - 0.2 dB per titik
 * - Output OLT standar: +3.0 dBm (Class B+) hingga +5.0 dBm (Class C+)
 */
export function estimateOpticalBudget(feederMeters = 0, distMeters = 0, dropMeters = 0) {
  const totalKm = (feederMeters + distMeters + dropMeters) / 1000;
  const fiberLoss = totalKm * 0.35; // dB
  const odcSplitterLoss = 7.2; // dB (Splitter 1:4)
  const odpSplitterLoss = 10.5; // dB (Splitter 1:8)
  const connectorLoss = 0.8; // dB (4 konektor SC/UPC / SC/APC)

  const totalLoss = Number((fiberLoss + odcSplitterLoss + odpSplitterLoss + connectorLoss).toFixed(2));
  const oltPower = 4.0; // dBm rata-rata
  const rxPower = Number((oltPower - totalLoss).toFixed(2));

  let status = "OPTIMAL";
  let statusText = "Sangat Baik (Standar Emas)";
  let color = "text-emerald-500";
  let bg = "bg-emerald-50 text-emerald-700 border-emerald-200";

  if (rxPower < -24.0) {
    status = "KRITIS";
    statusText = "Kritis (Mendekati Batas Sensitivitas ONT -27 dBm)";
    color = "text-rose-600";
    bg = "bg-rose-50 text-rose-700 border-rose-200";
  } else if (rxPower < -21.0) {
    status = "SEDANG";
    statusText = "Cukup / Perlu Perhatian";
    color = "text-amber-500";
    bg = "bg-amber-50 text-amber-700 border-amber-200";
  }

  return {
    oltPower,
    totalLoss,
    rxPower,
    status,
    statusText,
    color,
    bg,
  };
}

/**
 * Menghasilkan posisi titik rumah pelanggan di sekitar tiang ODP induknya
 * Jika pelanggan memiliki koordinat GPS asli, gunakan koordinat tersebut.
 * Jika tidak, letakkan dengan sebaran realistis (radius 25m - 65m) mengitari ODP.
 */
export function generateCustomerPremisePoints(pelangganList = [], odpPoints = []) {
  if (!Array.isArray(pelangganList) || !Array.isArray(odpPoints)) return [];

  const odpMap = new Map();
  odpPoints.forEach((pt) => {
    if (pt.name) {
      odpMap.set(normalizeOdpName(pt.name), pt);
      // Simpan juga versi bersih tanpa kata ODP
      odpMap.set(pt.name.toUpperCase().replace(/\s+/g, ""), pt);
    }
  });

  // Track index pelanggan per ODP untuk distribusi sudut lingkaran (agar tidak menumpuk)
  const countPerOdp = {};

  return pelangganList.map((cust, idx) => {
    const rawOdp = cust.odp || "";
    const cleanOdp = normalizeOdpName(rawOdp);
    const parentOdp = odpMap.get(cleanOdp) || odpMap.get(rawOdp.toUpperCase().replace(/\s+/g, ""));

    // Jika pelanggan sudah punya koordinat asli
    if (cust.lat && cust.lng) {
      const dropDist = parentOdp ? getDistanceMeters(cust.lat, cust.lng, parentOdp.lat, parentOdp.lng) : 35;
      return {
        ...cust,
        lat: cust.lat,
        lng: cust.lng,
        parentOdp: parentOdp || null,
        dropcoreDistance: dropDist,
        dropcorePolyline: parentOdp ? [[parentOdp.lat, parentOdp.lng], [cust.lat, cust.lng]] : null,
      };
    }

    if (!parentOdp) {
      // Fallback koordinat jika ODP tidak ditemukan di peta KML (offset dari pusat)
      return {
        ...cust,
        lat: -0.101658 + (idx * 0.0003),
        lng: 109.396582 + (idx * 0.0003),
        parentOdp: null,
        dropcoreDistance: 40,
        dropcorePolyline: null,
      };
    }

    // Sebaran sudut melingkar di sekitar tiang ODP (radius ~25m hingga 65m)
    const seq = countPerOdp[cleanOdp] || 0;
    countPerOdp[cleanOdp] = seq + 1;

    // Angle unik per urutan pelanggan (Golden ratio distribution)
    const angle = (seq * 67.5 + (idx % 4) * 45) * (Math.PI / 180);
    // Radius jarak tarikan kabel dropcore (antara 25 meter sampai 65 meter)
    const radiusMeters = 25 + ((seq * 13 + idx * 7) % 40);
    // 1 derajat latitude ~ 111,320 meter
    // 1 derajat longitude ~ 111,320 * cos(lat) meter
    const deltaLat = (radiusMeters * Math.cos(angle)) / 111320;
    const deltaLng = (radiusMeters * Math.sin(angle)) / (111320 * Math.cos((parentOdp.lat * Math.PI) / 180));

    const custLat = parentOdp.lat + deltaLat;
    const custLng = parentOdp.lng + deltaLng;
    const dropDist = getDistanceMeters(parentOdp.lat, parentOdp.lng, custLat, custLng);

    return {
      ...cust,
      lat: custLat,
      lng: custLng,
      parentOdp: parentOdp,
      dropcoreDistance: dropDist,
      dropcorePolyline: [
        [parentOdp.lat, parentOdp.lng],
        [custLat, custLng],
      ],
    };
  });
}

/**
 * Menelusuri seluruh rantai jalur jaringan FTTH (End-to-End Tracing)
 * Mulai dari Pusat (HQ) -> Kabel Feeder -> ODC -> Kabel Distribusi -> ODP -> Dropcore -> Pelanggan
 */
export function traceNetworkPath(targetItem, kmlData, customers = []) {
  if (!targetItem || !kmlData) return null;

  const points = kmlData.points || [];
  const lines = kmlData.lines || [];
  const hq = points.find((p) => p.type === "HEADEND") || kmlData.office || {
    id: "hq-default",
    name: "KANTOR NEXUS INDONESIA CORP",
    type: "HEADEND",
    lat: -0.1016581,
    lng: 109.3965822,
  };

  let targetOdp = null;
  let targetCustomer = null;
  let targetOdc = null;

  if (targetItem.type === "ODP" || targetItem.type === "SUB_ODP") {
    targetOdp = targetItem;
  } else if (targetItem.type === "ODC") {
    targetOdc = targetItem;
  } else if (targetItem.id_pelanggan || targetItem.nama) {
    // Target adalah pelanggan
    targetCustomer = targetItem;
    if (targetItem.parentOdp) {
      targetOdp = targetItem.parentOdp;
    } else if (targetItem.odp) {
      const cOdp = normalizeOdpName(targetItem.odp);
      targetOdp = points.find((p) => normalizeOdpName(p.name) === cOdp);
    }
  }

  // Jika target ODP diketahui, cari ODC induknya
  if (targetOdp && !targetOdc) {
    // Cari ODC berdasarkan nama (contoh: ODP 1.2 biasanya berinduk ke ODC 1)
    const odpName = targetOdp.name || "";
    const matchOdcNum = odpName.match(/ODP\s*(\d+)/i);
    const odcNumber = matchOdcNum ? matchOdcNum[1] : null;

    if (odcNumber) {
      targetOdc = points.find((p) => p.type === "ODC" && new RegExp(`ODC\\s*${odcNumber}\\b`, "i").test(p.name));
    }

    // Jika belum ketemu, cari ODC terdekat secara geografis
    if (!targetOdc) {
      const odcs = points.filter((p) => p.type === "ODC");
      let closest = null;
      let minD = Infinity;
      odcs.forEach((odc) => {
        const d = getDistanceMeters(targetOdp.lat, targetOdp.lng, odc.lat, odc.lng);
        if (d < minD) {
          minD = d;
          closest = odc;
        }
      });
      targetOdc = closest;
    }
  }

  // Cari jalur kabel KML yang menghubungkan:
  // 1. Feeder: Jalur dari HQ ke ODC
  const feederLine = lines.find((l) => {
    const n = (l.name || "").toLowerCase();
    return (
      (n.includes("kantor") || n.includes("hq") || n.includes("pusat")) &&
      (targetOdc ? n.includes(targetOdc.name.toLowerCase().replace("odc ", "")) : true)
    );
  }) || lines[0] || null;

  // 2. Distribusi: Jalur dari ODC ke ODP
  const distLine = lines.find((l) => {
    if (!targetOdp) return false;
    const n = (l.name || "").toLowerCase();
    const cleanOdp = (targetOdp.name || "").toLowerCase();
    return n.includes(cleanOdp) || cleanOdp.includes(n.replace("jalur ", ""));
  }) || null;

  // Hitung jarak estimasi
  const feederDistance = feederLine
    ? Math.round(feederLine.coords.reduce((acc, cur, i, arr) => (i === 0 ? 0 : acc + getDistanceMeters(arr[i - 1][0], arr[i - 1][1], cur[0], cur[1])), 0))
    : (targetOdc ? getDistanceMeters(hq.lat, hq.lng, targetOdc.lat, targetOdc.lng) : 500);

  const distDistance = distLine
    ? Math.round(distLine.coords.reduce((acc, cur, i, arr) => (i === 0 ? 0 : acc + getDistanceMeters(arr[i - 1][0], arr[i - 1][1], cur[0], cur[1])), 0))
    : (targetOdc && targetOdp ? getDistanceMeters(targetOdc.lat, targetOdc.lng, targetOdp.lat, targetOdp.lng) : 250);

  const dropDistance = targetCustomer?.dropcoreDistance || 45;

  // Cari seluruh pelanggan yang terhubung ke ODP ini
  const relatedCustomers = targetOdp
    ? customers.filter((c) => {
        if (!c.odp && !targetOdp.name) return false;
        return normalizeOdpName(c.odp || "") === normalizeOdpName(targetOdp.name || "");
      })
    : [];

  const optical = estimateOpticalBudget(feederDistance, distDistance, dropDistance);

  // Buat garis direct fallback jika koordinat KML polyline tidak tersedia
  const fallbackFeederCoords = targetOdc ? [[hq.lat, hq.lng], [targetOdc.lat, targetOdc.lng]] : [];
  const fallbackDistCoords = targetOdc && targetOdp ? [[targetOdc.lat, targetOdc.lng], [targetOdp.lat, targetOdp.lng]] : [];

  return {
    hq,
    odc: targetOdc,
    odp: targetOdp,
    customer: targetCustomer,
    relatedCustomers,
    feederDistance,
    distDistance,
    dropDistance,
    optical,
    feederCoords: feederLine?.coords || fallbackFeederCoords,
    distCoords: distLine?.coords || fallbackDistCoords,
    dropCoords: targetCustomer?.dropcorePolyline || null,
  };
}
