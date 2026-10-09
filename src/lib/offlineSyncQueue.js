import { uploadTaskEvidenceBundle } from "./storageUpload";

/**
 * Utilitas Manajemen Antrean Sinkronisasi Foto & Laporan Offline (PWA Field Resilience)
 * Menyimpan dan mengunggah foto lapangan yang tertunda saat teknisi bekerja di blank spot/tiang ODP.
 */

export function isOfflineDataUrl(str) {
  return typeof str === "string" && str.startsWith("data:image");
}

/**
 * Deteksi tugas-tugas yang memiliki foto bukti berformat DataURL (menunggu upload ke Supabase Storage)
 */
export function getPendingOfflineTasks(pekerjaanList = []) {
  if (!Array.isArray(pekerjaanList)) return [];

  return pekerjaanList.filter((t) => {
    if (!t) return false;
    const opmPending = isOfflineDataUrl(t.foto_opm);
    const dropPending = isOfflineDataUrl(t.foto_dropcore);
    const modemPending = isOfflineDataUrl(t.foto_modem);
    const evOpmPending = isOfflineDataUrl(t.evidence?.foto_opm);
    const evDropPending = isOfflineDataUrl(t.evidence?.foto_dropcore);
    const evModemPending = isOfflineDataUrl(t.evidence?.foto_modem);

    return opmPending || dropPending || modemPending || evOpmPending || evDropPending || evModemPending;
  });
}

/**
 * Hitung jumlah total foto yang masih berformat DataURL
 */
export function countPendingOfflinePhotos(pekerjaanList = []) {
  const pendingTasks = getPendingOfflineTasks(pekerjaanList);
  let count = 0;
  pendingTasks.forEach((t) => {
    if (isOfflineDataUrl(t.foto_opm)) count++;
    if (isOfflineDataUrl(t.foto_dropcore)) count++;
    if (isOfflineDataUrl(t.foto_modem)) count++;
  });
  return count;
}

/**
 * Eksekusi upload latar belakang untuk semua foto yang tertunda ke Supabase Storage
 */
export async function flushPendingOfflineEvidence(pekerjaanList = [], setPekerjaanList) {
  if (!navigator.onLine) {
    return { success: false, message: "Perangkat masih dalam kondisi offline." };
  }

  const pendingTasks = getPendingOfflineTasks(pekerjaanList);
  if (pendingTasks.length === 0) {
    return { success: true, uploadedCount: 0, message: "Semua laporan sudah tersinkronisasi ke Cloud." };
  }

  let uploadedPhotos = 0;
  let updatedTasksCount = 0;

  try {
    const updatedMap = new Map();

    for (const task of pendingTasks) {
      const rawEvidence = {
        foto_opm: task.foto_opm || task.evidence?.foto_opm,
        foto_dropcore: task.foto_dropcore || task.evidence?.foto_dropcore,
        foto_modem: task.foto_modem || task.evidence?.foto_modem,
      };

      try {
        const uploadedBundle = await uploadTaskEvidenceBundle(rawEvidence, task.id);
        const hasUploaded =
          !isOfflineDataUrl(uploadedBundle.foto_opm) ||
          !isOfflineDataUrl(uploadedBundle.foto_dropcore) ||
          !isOfflineDataUrl(uploadedBundle.foto_modem);

        if (hasUploaded) {
          const updatedTask = {
            ...task,
            foto_opm: uploadedBundle.foto_opm,
            foto_dropcore: uploadedBundle.foto_dropcore,
            foto_modem: uploadedBundle.foto_modem,
            evidence: {
              ...(task.evidence || {}),
              ...uploadedBundle,
            },
          };

          updatedMap.set(task.id, updatedTask);
          updatedTasksCount++;
          if (isOfflineDataUrl(rawEvidence.foto_opm) && !isOfflineDataUrl(uploadedBundle.foto_opm)) uploadedPhotos++;
          if (isOfflineDataUrl(rawEvidence.foto_dropcore) && !isOfflineDataUrl(uploadedBundle.foto_dropcore)) uploadedPhotos++;
          if (isOfflineDataUrl(rawEvidence.foto_modem) && !isOfflineDataUrl(uploadedBundle.foto_modem)) uploadedPhotos++;
        }
      } catch (uploadErr) {
        console.warn(`[OFFLINE FLUSH] Gagal upload foto task id=${task.id}:`, uploadErr);
      }
    }

    if (updatedTasksCount > 0 && setPekerjaanList) {
      setPekerjaanList((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        return list.map((t) => (updatedMap.has(t.id) ? updatedMap.get(t.id) : t));
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("xnet_offline_sync_completed", {
            detail: { uploadedPhotos, updatedTasksCount },
          })
        );
      }
    }

    return {
      success: true,
      uploadedCount: uploadedPhotos,
      updatedTasksCount,
      message: `${uploadedPhotos} foto bukti lapangan dari ${updatedTasksCount} tugas berhasil diunggah ke Cloud!`,
    };
  } catch (err) {
    console.error("[OFFLINE FLUSH EXCEPTION]", err);
    return { success: false, error: err.message };
  }
}
