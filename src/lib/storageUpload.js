import { supabase } from "./supabase.js";

export const EVIDENCE_BUCKET = "evidence-photos";

/**
 * Konversi Base64 Data URL menjadi Binary Blob
 */
export function dataUrlToBlob(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) return null;
  try {
    const parts = dataUrl.split(",");
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (err) {
    console.warn("Gagal konversi DataURL ke Blob:", err);
    return null;
  }
}

/**
 * Upload single evidence photo ke Supabase Storage Bucket 'evidence-photos'.
 * Jika bucket belum ada atau koneksi gagal, otomatis fallback ke DataURL lokal
 * sehingga aplikasi tidak pernah macet (Zero-Downtime Guarantee).
 * 
 * @param {string|Blob|File} fileOrDataUrl 
 * @param {string} folder 
 * @param {string} fileNamePrefix 
 * @returns {Promise<string>} Public URL atau DataURL fallback
 */
export async function uploadEvidencePhoto(fileOrDataUrl, folder = "evidence", fileNamePrefix = "doc") {
  if (!fileOrDataUrl) return null;

  // Jika sudah berupa URL publik (http / https), kembalikan langsung
  if (typeof fileOrDataUrl === "string" && fileOrDataUrl.startsWith("http")) {
    return fileOrDataUrl;
  }

  let blob = null;
  let fileExt = "jpg";

  if (fileOrDataUrl instanceof Blob || (typeof File !== "undefined" && fileOrDataUrl instanceof File)) {
    blob = fileOrDataUrl;
    fileExt = fileOrDataUrl.type?.includes("png") ? "png" : "jpg";
  } else if (typeof fileOrDataUrl === "string" && fileOrDataUrl.startsWith("data:")) {
    blob = dataUrlToBlob(fileOrDataUrl);
    fileExt = fileOrDataUrl.includes("image/png") ? "png" : "jpg";
  } else {
    return fileOrDataUrl;
  }

  if (!blob) return fileOrDataUrl;

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 7);
  const cleanPrefix = (fileNamePrefix || "doc").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filePath = `${folder}/${cleanPrefix}_${timestamp}_${randomStr}.${fileExt}`;

  try {
    const { data, error } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .upload(filePath, blob, {
        contentType: blob.type || "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.warn("Supabase Storage upload info (fallback ke local data):", error.message);
      return fileOrDataUrl;
    }

    // Dapatkan URL publik dari file yang berhasil diunggah
    const { data: publicData } = supabase.storage.from(EVIDENCE_BUCKET).getPublicUrl(data.path);
    return publicData?.publicUrl || fileOrDataUrl;
  } catch (err) {
    console.warn("Storage upload exception (fallback ke local data):", err);
    return fileOrDataUrl;
  }
}

/**
 * Upload seluruh bundel foto bukti lapangan secara paralel
 * @param {object} evidence - { foto_opm, foto_dropcore, foto_modem, ... }
 * @param {string|number} taskId - ID pekerjaan
 * @returns {Promise<object>} Evidence object dengan URL Supabase Storage
 */
export async function uploadTaskEvidenceBundle(evidence, taskId) {
  if (!evidence) return evidence;
  const prefix = `task_${taskId || Date.now()}`;

  try {
    const [urlOpm, urlDropcore, urlModem] = await Promise.all([
      uploadEvidencePhoto(evidence.foto_opm, "evidence", `${prefix}_opm`),
      uploadEvidencePhoto(evidence.foto_dropcore, "evidence", `${prefix}_dropcore`),
      uploadEvidencePhoto(evidence.foto_modem, "evidence", `${prefix}_modem`),
    ]);

    return {
      ...evidence,
      foto_opm: urlOpm,
      foto_dropcore: urlDropcore,
      foto_modem: urlModem,
    };
  } catch (err) {
    console.warn("Gagal bundle upload evidence:", err);
    return evidence;
  }
}
