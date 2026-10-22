/**
 * offlineSync.js
 * Manajemen Antrean Offline & Sinkronisasi Otomatis Lapangan (Zero-Data-Loss PWA)
 * 
 * Memastikan teknisi ISP di area blankspot (rumah beton, pelosok tiang)
 * tetap bisa menyelesaikan pengerjaan atau melaporkan kendala tanpa terganggu,
 * dan secara otomatis mensinkronkan data & foto bukti ke server saat sinyal pulih.
 */

export const QUEUE_STORAGE_KEY = "xnet_offline_queue";

/**
 * Mengambil seluruh daftar antrean tugas yang tertunda secara lokal
 * @returns {Array} List of offline queue items
 */
export function getOfflineQueue() {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("[OFFLINE_QUEUE] Gagal membaca storage:", err);
    return [];
  }
}

/**
 * Menyimpan antrean ke localStorage dan memancarkan event pembaruan
 * @param {Array} queue 
 */
export function saveOfflineQueue(queue) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const cleanList = Array.isArray(queue) ? queue : [];
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(cleanList));
    window.dispatchEvent(new CustomEvent("xnet_offline_queue_updated", { detail: { queue: cleanList } }));
  } catch (err) {
    console.warn("[OFFLINE_QUEUE] Gagal menyimpan antrean:", err);
  }
}

/**
 * Menambahkan pekerjaan ke antrean offline
 * @param {object} item - { type, taskId, taskData, evidenceBundle, reason, customerName, jenis }
 * @returns {object} The queued item
 */
export function addToOfflineQueue(item) {
  const currentQueue = getOfflineQueue();
  const queueId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  const existing = currentQueue.find((q) => q.taskId === item.taskId);

  const newEntry = {
    id: existing ? existing.id : queueId,
    type: item.type || existing?.type || "COMPLETE_TASK", // COMPLETE_TASK | KENDALA_TASK
    taskId: item.taskId,
    customerName: item.customerName || item.taskData?.pelanggan || existing?.customerName || "Pelanggan",
    jenis: item.jenis || item.taskData?.jenis || existing?.jenis || "PEKERJAAN",
    taskData: item.taskData || existing?.taskData || null,
    evidenceBundle: item.evidenceBundle || existing?.evidenceBundle || null,
    reason: item.reason || existing?.reason || "",
    status: "PENDING", // PENDING | SYNCING | FAILED
    retryCount: 0,
    queuedAt: existing?.queuedAt || nowIso,
  };

  // Dedup: jika task dengan ID yang sama sudah ada di antrean, ganti dengan versi terbaru
  const filtered = currentQueue.filter((q) => q.taskId !== item.taskId);
  const updatedQueue = [...filtered, newEntry];

  saveOfflineQueue(updatedQueue);
  return newEntry;
}

/**
 * Menghapus item dari antrean berdasarkan queueId atau taskId
 * @param {string|number} identifier 
 */
export function removeFromOfflineQueue(identifier) {
  const currentQueue = getOfflineQueue();
  const updatedQueue = currentQueue.filter(
    (q) => q.id !== identifier && q.taskId !== identifier
  );
  saveOfflineQueue(updatedQueue);
  return updatedQueue;
}

/**
 * Membersihkan seluruh antrean offline
 */
export function clearOfflineQueue() {
  saveOfflineQueue([]);
}

/**
 * Menjalankan proses sinkronisasi antrean ke server / Supabase
 * @param {Array} queue
 * @param {object} handlers - { uploadBundleFn, onProgress, onSyncItemSuccess }
 * @returns {Promise<{ syncedCount: number, failedCount: number, remainingQueue: Array }>}
 */
export async function processOfflineSyncQueue(queue, handlers = {}) {
  const list = Array.isArray(queue) ? [...queue] : getOfflineQueue();
  if (list.length === 0) {
    return { syncedCount: 0, failedCount: 0, remainingQueue: [] };
  }

  let syncedCount = 0;
  let failedCount = 0;
  const remaining = [];

  for (const item of list) {
    try {
      if (handlers.onProgress) {
        handlers.onProgress(item, syncedCount, list.length);
      }

      let finalTaskData = item.taskData;

      // Jika laporan penyelesaian, coba unggah foto bukti lapangan ke storage
      if (item.type === "COMPLETE_TASK" && handlers.uploadBundleFn && item.evidenceBundle) {
        try {
          const uploadedEvidence = await handlers.uploadBundleFn(item.evidenceBundle, item.taskId);
          if (uploadedEvidence && finalTaskData) {
            finalTaskData = {
              ...finalTaskData,
              evidence: uploadedEvidence,
              foto_bukti_utama: uploadedEvidence.foto_bukti_utama || finalTaskData.foto_bukti_utama,
              foto_opm: uploadedEvidence.foto_opm || finalTaskData.foto_opm,
              foto_dropcore: uploadedEvidence.foto_dropcore || finalTaskData.foto_dropcore,
              foto_modem: uploadedEvidence.foto_modem || finalTaskData.foto_modem,
            };
          }
        } catch (uploadErr) {
          console.warn(`[OFFLINE_SYNC] Upload bukti foto task #${item.taskId} gagal, menggunakan data lokal:`, uploadErr);
        }
      }

      // Pastikan flag offline draft dicabut saat berhasil disinkronkan
      if (finalTaskData) {
        finalTaskData = {
          ...finalTaskData,
          is_offline_draft: false,
          synced_at: new Date().toISOString(),
        };
      }

      if (handlers.onSyncItemSuccess) {
        await handlers.onSyncItemSuccess(item, finalTaskData);
      }

      syncedCount++;
    } catch (err) {
      console.error(`[OFFLINE_SYNC] Gagal sinkronisasi item #${item.id}:`, err);
      failedCount++;
      remaining.push({
        ...item,
        retryCount: (item.retryCount || 0) + 1,
        lastError: err.message || "Network Error",
        status: "FAILED",
      });
    }
  }

  saveOfflineQueue(remaining);

  return {
    syncedCount,
    failedCount,
    remainingQueue: remaining,
  };
}
