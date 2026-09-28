export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const inputUrl = req.query.url;

  if (!inputUrl) {
    return res.status(400).json({ success: false, error: "Parameter 'url' wajib disertakan." });
  }

  try {
    // 1. Cek apakah ada koordinat langsung di dalam URL string
    const directCoordRegex = /([+-]?\d{1,2}\.\d+)[,\s]+([+-]?\d{1,3}\.\d+)/;
    const directMatch = decodeURIComponent(inputUrl).match(directCoordRegex);
    if (directMatch) {
      const lat = parseFloat(directMatch[1]);
      const lng = parseFloat(directMatch[2]);
      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        return res.status(200).json({
          success: true,
          lat,
          lng,
          source: "direct_param",
        });
      }
    }

    // 2. Jika merupakan Google Maps shortlink (maps.app.goo.gl atau goo.gl/maps), ikuti redirect
    const response = await fetch(inputUrl, {
      method: "HEAD",
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const finalUrl = response.url || "";

    // Coba ekstrak pola koordinat dari final URL
    // Pola 1: @-0.123456,109.123456
    // Pola 2: ?q=-0.123456,109.123456
    // Pola 3: /place/-0.123456,109.123456
    const patterns = [
      /@([+-]?\d+\.\d+),([+-]?\d+\.\d+)/,
      /[?&]q=([+-]?\d+\.\d+),([+-]?\d+\.\d+)/,
      /[?&]ll=([+-]?\d+\.\d+),([+-]?\d+\.\d+)/,
      /[?&]daddr=([+-]?\d+\.\d+),([+-]?\d+\.\d+)/,
      /\/place\/([+-]?\d+\.\d+)[,\+]([+-]?\d+\.\d+)/,
      /([+-]?\d{1,2}\.\d+)[,\s]+([+-]?\d{1,3}\.\d+)/,
    ];

    for (const pat of patterns) {
      const match = finalUrl.match(pat);
      if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
          return res.status(200).json({
            success: true,
            lat,
            lng,
            finalUrl,
            source: "redirect_resolved",
          });
        }
      }
    }

    return res.status(404).json({
      success: false,
      error: "Gagal menemukan koordinat dari tautan tersebut.",
      finalUrl,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Gagal mengurai tautan: " + err.message,
    });
  }
}
