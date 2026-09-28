/**
 * Utilitas Simulasi Survey Lokasi & Kalkulasi Jangkauan ODP / ODC
 * Menghubungkan Leads, Google Maps Shareloc, dan Citra Satelit Google Earth
 */

// Rumus Haversine: Jarak Garis Lurus (Meter)
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radius bumi dalam meter
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
 * Parsing cerdas berbagai format teks & tautan sharelokasi:
 * 1. Koordinat langsung: "-0.131807, 109.391669"
 * 2. URL Google Maps lengkap:
 *    - https://maps.google.com/?q=-0.131807,109.391669
 *    - https://www.google.com/maps/@-0.131807,109.391669,17z
 *    - https://www.google.com/maps/place/Pontianak/@-0.1318,109.3916
 * 3. Shortlink Google Maps (maps.app.goo.gl / goo.gl/maps) via API Resolver
 */
export async function parseShareLocation(input) {
  if (!input || typeof input !== "string") return null;
  const text = input.trim();

  // 1. Ekstrak langsung pola koordinat angka di dalam string / URL
  const patterns = [
    /@([+-]?\d{1,2}\.\d+),([+-]?\d{1,3}\.\d+)/,
    /[?&]q=([+-]?\d{1,2}\.\d+),([+-]?\d{1,3}\.\d+)/,
    /[?&]ll=([+-]?\d{1,2}\.\d+),([+-]?\d{1,3}\.\d+)/,
    /[?&]daddr=([+-]?\d{1,2}\.\d+),([+-]?\d{1,3}\.\d+)/,
    /place\/.*?\/@([+-]?\d{1,2}\.\d+),([+-]?\d{1,3}\.\d+)/,
    /geo:([+-]?\d{1,2}\.\d+),([+-]?\d{1,3}\.\d+)/,
    /([+-]?\d{1,2}\.\d+)[,\s]+([+-]?\d{1,3}\.\d+)/,
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return {
          lat,
          lng,
          source: "direct_coordinate",
          rawInput: text,
        };
      }
    }
  }

  // 2. Jika merupakan URL pendek (maps.app.goo.gl atau goo.gl/maps)
  if (text.includes("maps.app.goo.gl") || text.includes("goo.gl/maps")) {
    try {
      const apiUrl = `/api/resolve-location?url=${encodeURIComponent(text)}`;
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.lat && data.lng) {
          return {
            lat: data.lat,
            lng: data.lng,
            source: "shortlink_resolved",
            rawInput: text,
          };
        }
      }
    } catch {
      // Fallback diam jika offline
    }
  }

  return null;
}

/**
 * Estimasi Redaman Optik (Optical Power Loss Rx)
 * Asumsi:
 * - OLT Tx Power: +3.0 dBm
 * - Splitter 1:8 Loss: ~10.5 dBm
 * - Redaman Fiber Kabel Dropcore (G.657A): ~0.35 dB per km
 * - Loss sambungan fast connector / adapter: ~0.5 dB
 */
export function calculateOpticalLoss(estCableMeters) {
  const km = estCableMeters / 1000;
  const cableLoss = km * 0.35;
  const totalLoss = 10.5 + 0.5 + cableLoss; // perkiraan loss
  const rxPowerDbm = -7.0 - totalLoss; // perkiraan sinyal tiba di modem ont pelanggan

  let status = "PRIMA";
  let color = "text-emerald-600";
  let badgeBg = "bg-emerald-100 text-emerald-800";

  if (rxPowerDbm < -24.0) {
    status = "KRITIS / DROP";
    color = "text-rose-600";
    badgeBg = "bg-rose-100 text-rose-800";
  } else if (rxPowerDbm < -21.0) {
    status = "SEDANG / SURVEY";
    color = "text-amber-600";
    badgeBg = "bg-amber-100 text-amber-800";
  }

  return {
    rxPowerDbm: parseFloat(rxPowerDbm.toFixed(1)),
    status,
    color,
    badgeBg,
    desc: `Prediksi daya sinyal di ONT: ${rxPowerDbm.toFixed(1)} dBm (${status})`,
  };
}

/**
 * Kalkulasi Biaya Kabel Dropcore
 * ISP standar: 100 meter gratis (termasuk paket instalasi).
 * Kelebihan kabel: Rp 1.500 / meter.
 */
export function calculateDropcoreCost(estCableMeters, freeAllowance = 100, costPerMeter = 1500) {
  const excessMeters = Math.max(0, estCableMeters - freeAllowance);
  const excessCost = excessMeters * costPerMeter;

  return {
    estCableMeters,
    freeAllowance,
    excessMeters,
    costPerMeter,
    excessCost,
    formattedCost: new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(excessCost),
    isFree: excessMeters === 0,
  };
}

import defaultKmlData from "../data/kmlNetworkData.json";

/**
 * Temukan ODP Terdekat dari Koordinat Titik Survey
 */
export function findNearestOdpFromList(lat, lng, odpPoints = null) {
  const pointsToSearch = odpPoints && odpPoints.length > 0 ? odpPoints : (defaultKmlData?.points || []);
  if (!pointsToSearch || pointsToSearch.length === 0) return null;

  const validOdps = pointsToSearch
    .filter((p) => p && p.lat && p.lng && (p.type === "ODP" || !p.type))
    .map((p) => {
      const straightDist = haversineDistance(lat, lng, p.lat, p.lng);
      const estCable = Math.round(straightDist * 1.2); // +20% lekukan tiang & tarikan ke rumah

      let tier = "OUT";
      let statusText = "Di Luar Jangkauan";
      let tierColor = "#EF4444";
      let tierBadge = "bg-rose-500 text-white";

      if (straightDist <= 150) {
        tier = "IDEAL";
        statusText = "Sangat Layak (Standar)";
        tierColor = "#10B981";
        tierBadge = "bg-emerald-500 text-slate-950 font-black";
      } else if (straightDist <= 250) {
        tier = "SURVEY";
        statusText = "Bisa Dipasang (Perlu Survey)";
        tierColor = "#F59E0B";
        tierBadge = "bg-amber-500 text-slate-950 font-black";
      }

      const loss = calculateOpticalLoss(estCable);
      const cost = calculateDropcoreCost(estCable);

      return {
        ...p,
        straightDist,
        estCable,
        tier,
        statusText,
        tierColor,
        tierBadge,
        loss,
        cost,
      };
    });

  validOdps.sort((a, b) => a.straightDist - b.straightDist);

  return {
    target: { lat, lng },
    best: validOdps[0] || null,
    alternatives: validOdps.slice(1, 4),
  };
}

/**
 * Template Pesan WhatsApp Resmi Hasil Simulasi Survey Lokasi
 */
export function generateSurveyWhatsAppMessage({
  leadName = "Calon Pelanggan",
  phone = "",
  address = "",
  bestOdp = null,
  alternatives = [],
  companyName = "Nexus Net Management",
}) {
  if (!bestOdp) return "";

  const statusEmoji = bestOdp.tier === "IDEAL" ? "🟢" : bestOdp.tier === "SURVEY" ? "🟡" : "🔴";
  const statusHeader =
    bestOdp.tier === "IDEAL"
      ? "SANGAT LAYAK (BISA LANGSUNG INSTALASI)"
      : bestOdp.tier === "SURVEY"
      ? "BISA DIPASANG (PERLU CEK TIANG / SURVEY TEKNISI)"
      : "DI LUAR JANGKAUAN ODP STANDAR";

  const altList =
    alternatives.length > 0
      ? alternatives.map((a, i) => `  ${i + 1}. *${a.name}* (~${a.straightDist}m - est kabel ${a.estCable}m)`).join("\n")
      : "-";

  return `*HASIL SIMULASI SURVEY COVERAGE ODP - ${companyName}*
--------------------------------------------------
👤 *Nama Lead:* ${leadName}
📞 *Kontak:* ${phone || "-"}
📍 *Alamat:* ${address || "-"}

${statusEmoji} *STATUS KELAYAKAN:*
*${statusHeader}*

📡 *ODP TERDEKAT:*
• Nama Tiang: *${bestOdp.name}*
• ODC Induk: *${bestOdp.odc || "-"}*
• Jarak Garis Lurus: *${bestOdp.straightDist} Meter*
• Estimasi Kabel Dropcore: *~${bestOdp.estCable} Meter*
• Prediksi Redaman Optik: *${bestOdp.loss?.rxPowerDbm || "-"} dBm* (${bestOdp.loss?.status || "Normal"})
• Biaya Tambahan Kabel: *${bestOdp.cost?.isFree ? "GRATIS (Di bawah batas 100m)" : bestOdp.cost?.formattedCost}*

🔁 *ODP Alternatif Terdekat:*
${altList}

🗺️ *Cek Lokasi Satelit:*
https://maps.google.com/?q=${bestOdp.lat},${bestOdp.lng}

_Laporan dibuat secara otomatis melalui Simulasi Google Earth GIS System._`;
}
