/**
 * Utilitas Kompresi & Watermark Kamera Lapangan Teknisi (Client-Side)
 * - Menempelkan stempel permanen (Timestamp WIB, Koordinat GPS, ODP & Port, Pelanggan, Tim)
 * - Mengompresi gambar dari smartphone (3-8MB) menjadi JPEG ringan (~50-80KB)
 */

/**
 * Mengambil koordinat GPS real-time browser/smartphone
 * @returns {Promise<{ lat: number, lng: number, accuracy: number } | null>}
 */
export function getCurrentLocation() {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy || 0),
        });
      },
      (err) => {
        console.warn("Peringatan sensor GPS (lanjut tanpa GPS):", err.message);
        resolve(null);
      },
      { timeout: 5000, maximumAge: 30000, enableHighAccuracy: true }
    );
  });
}

/**
 * Format timestamp waktu Indonesia Barat (WIB)
 */
export function formatTimestampWIB(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const options = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  };
  return d.toLocaleString("id-ID", options) + " WIB";
}

/**
 * Menggambar stempel watermark QC Telekomunikasi di atas canvas
 */
function drawTelecomWatermark(ctx, width, height, options = {}) {
  const {
    label = "DOKUMENTASI LAPANGAN",
    odp = "ODP",
    customer = "Pelanggan",
    technician = "Tim Teknisi",
    location = null,
    timestamp = formatTimestampWIB(),
  } = options;

  ctx.save();

  // 1. Bar Ribbon Bawah Semi-Transparan (Proporsional tinggi canvas)
  const barHeight = Math.max(75, Math.round(height * 0.13));
  const barY = height - barHeight;

  // Background Gradient hitam pekat ke transparan
  const gradient = ctx.createLinearGradient(0, barY, 0, height);
  gradient.addColorStop(0, "rgba(15, 23, 42, 0.94)"); // Slate 900
  gradient.addColorStop(1, "rgba(2, 6, 23, 0.98)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, barY, width, barHeight);

  // Garis aksen cyan modern di atas ribbon
  ctx.fillStyle = "#38BDF8"; // Sky 400
  ctx.fillRect(0, barY, width, 3);

  // 2. Teks Stempel
  const baseFontSize = Math.max(11, Math.round(width * 0.022));
  const paddingX = Math.round(width * 0.03);
  let currentY = barY + Math.round(barHeight * 0.28);

  // Baris 1: Header Badge & Label Bukti
  ctx.font = `bold ${baseFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = "#38BDF8"; // Cyan
  ctx.fillText(`[NEXUS QC] ${label.toUpperCase()}`, paddingX, currentY);

  // Tim Teknisi (align kanan)
  const techText = `TIM: ${technician}`;
  const techWidth = ctx.measureText(techText).width;
  ctx.fillStyle = "#F8FAFC";
  ctx.fillText(techText, width - paddingX - techWidth, currentY);

  // Baris 2: Waktu & GPS Lapangan
  currentY += Math.round(baseFontSize * 1.5);
  ctx.font = `500 ${Math.max(10, baseFontSize - 1)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = "#E2E8F0";

  let locStr = "📍 GPS: Sensor Offline / Lokasi Standar";
  if (location && location.lat && location.lng) {
    locStr = `📍 GPS: ${location.lat}, ${location.lng} (±${location.accuracy}m)`;
  }
  const timeAndGps = `🕒 ${timestamp}  |  ${locStr}`;
  ctx.fillText(timeAndGps, paddingX, currentY);

  // Baris 3: Target ODP & Pelanggan
  currentY += Math.round(baseFontSize * 1.4);
  ctx.font = `600 ${Math.max(10, baseFontSize - 1)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = "#FDE047"; // Kuning terang agar kontras
  const odpAndCust = `📶 ${odp}  •  👤 Pelanggan: ${customer}`;
  ctx.fillText(odpAndCust, paddingX, currentY);

  ctx.restore();
}

/**
 * Kompresi foto sekaligus menambahkan stempel Watermark GPS & Waktu
 * Menggunakan WebP (dengan fallback JPEG) dan batas 800x800 px (~25-45KB)
 * @param {File|Blob} file - File gambar mentah dari input kamera
 * @param {object} watermarkOptions - Metadata { label, odp, customer, technician, location }
 * @param {number} maxWidth - Batas lebar gambar (default 800px untuk efisiensi penyimpanan)
 * @param {number} maxHeight - Batas tinggi gambar (default 800px)
 * @param {number} quality - Kualitas kompresi (0.65 = ~25-45KB)
 * @returns {Promise<string>} Base64 DataURL bertanda tangan watermark
 */
export function compressAndWatermarkImage(
  file,
  watermarkOptions = {},
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.65
) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("File bukan format gambar yang valid"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file gambar"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal memproses gambar"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Skalakan proporsional jika melebihi batas resolusi
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Tempelkan watermark QC jika diminta
        if (watermarkOptions) {
          drawTelecomWatermark(ctx, width, height, watermarkOptions);
        }

        // Cek dukungan WebP untuk kompresi 30% lebih hemat data
        let exportFormat = "image/jpeg";
        try {
          const testWebp = canvas.toDataURL("image/webp");
          if (testWebp && testWebp.startsWith("data:image/webp")) {
            exportFormat = "image/webp";
          }
        } catch {
          exportFormat = "image/jpeg";
        }

        const base64 = canvas.toDataURL(exportFormat, quality);
        resolve(base64);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Backward compatibility helper
 */
export function compressImageFile(file, maxWidth = 800, maxHeight = 800, quality = 0.65) {
  return compressAndWatermarkImage(file, null, maxWidth, maxHeight, quality);
}
