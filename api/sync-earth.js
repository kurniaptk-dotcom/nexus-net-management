export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const docId = req.query.docId || "1jjol-j_FNp2XN5HD9YS9x2QPbfY9-PHf";

  try {
    // 1. Coba unduh dari Google Drive download URL
    const driveUrl = `https://drive.usercontent.google.com/download?id=${docId}&export=download`;
    const response = await fetch(driveUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `Gagal mengunduh KML dari Google Drive (Status: ${response.status}). Pastikan hak akses file diatur ke 'Anyone with the link' (Siapa saja yang memiliki link).`,
      });
    }

    const text = await response.text();

    // Periksa apakah ini halaman login Google (karena akses masih Restricted / Dibatasi)
    if (text.includes("accounts.google.com") || text.includes('id="gaia_loginform"') || text.includes("Sign in")) {
      return res.status(403).json({
        success: false,
        isRestricted: true,
        error: "Akses Google Earth masih 'Restricted' (Dibatasi). Silakan buka Google Earth Web -> klik tombol 'Bagikan Proyek' -> ubah Akses Umum menjadi 'Siapa saja yang memiliki link' (Anyone with link).",
      });
    }

    // Periksa apakah berisi XML KML yang valid
    if (!text.includes("<kml") && !text.includes("<Placemark")) {
      return res.status(400).json({
        success: false,
        error: "File yang diunduh bukan format KML yang valid.",
      });
    }

    // 2. Ekstrak Placemarks (Titik & Garis Jalur Kabel)
    const placemarkRegex = /<Placemark[\s\S]*?<\/Placemark>/g;
    const matches = text.match(placemarkRegex) || [];

    const points = [];
    const lines = [];

    matches.forEach((p) => {
      const nameMatch = p.match(/<name>(.*?)<\/name>/);
      const name = nameMatch
        ? nameMatch[1].replace(/&gt;/g, ">").replace(/&lt;/g, "<").trim()
        : "Unnamed";

      // Titik (Point)
      const pointMatch = p.match(/<Point>[\s\S]*?<coordinates>\s*([^\s<]+)\s*<\/coordinates>/);
      if (pointMatch) {
        const [lng, lat, alt] = pointMatch[1].split(",").map(Number);
        if (!isNaN(lat) && !isNaN(lng)) {
          let type = "ODP";
          if (name.toUpperCase().includes("KANTOR")) type = "HEADEND";
          else if (name.toUpperCase().startsWith("ODC") || name.toUpperCase().includes(" ODC"))
            type = "ODC";
          else if (name.toUpperCase().includes("SUB ODP")) type = "SUB_ODP";

          points.push({
            id: "kml-pt-" + points.length,
            name,
            type,
            lat: Number(lat.toFixed(7)),
            lng: Number(lng.toFixed(7)),
            alt: Math.round(alt || 0),
          });
        }
      }

      // Garis Kabel (LineString)
      const lineMatch = p.match(/<LineString>[\s\S]*?<coordinates>\s*([\s\S]*?)\s*<\/coordinates>/);
      if (lineMatch) {
        const rawCoords = lineMatch[1].trim().split(/\s+/);
        const coords = [];
        rawCoords.forEach((c) => {
          const parts = c.split(",").map(Number);
          if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            coords.push([Number(parts[1].toFixed(7)), Number(parts[0].toFixed(7))]);
          }
        });
        if (coords.length > 0) {
          lines.push({
            id: "kml-line-" + lines.length,
            name,
            coords,
          });
        }
      }
    });

    return res.status(200).json({
      success: true,
      lastSync: new Date().toISOString(),
      office: points.find((p) => p.type === "HEADEND") || points[0],
      totalPoints: points.length,
      totalLines: lines.length,
      points,
      lines,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Terjadi kesalahan server saat sinkronisasi Google Earth: " + err.message,
    });
  }
}
