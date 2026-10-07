import { useState, useEffect, useCallback, useRef } from "react";
import { db, supabase } from "../lib/supabase";

const TABLE_MAP = {
  xnet_pekerjaan: "pekerjaan",
  xnet_leads: "leads",
  xnet_gangguan: "gangguan",
  xnet_daftar_gangguan_v2: "daftar_gangguan",
  xnet_tim: "tim",
  xnet_odpodc: "odp_odc",
  xnet_pengajuan_pemutusan: "pengajuan_pemutusan",
  xnet_pelanggan_radius: "pelanggan_radius",
};

const BASE_PEKERJAAN_COLUMNS = ["tim", "jenis", "alamat", "pelanggan", "odp", "status", "tanggal", "keterangan"];

const ALLOWED_COLUMNS = {
  pekerjaan: [
    "tim",
    "jenis",
    "alamat",
    "pelanggan",
    "odp",
    "status",
    "tanggal",
    "keterangan",
    "spk_no",
    "prioritas",
    "sesi",
    "telepon",
    "port",
    "shareloc",
    "redaman",
    "sn_modem",
    "evidence",
    "komisi_items",
    "komisi_total",
    "waktu_selesai",
  ],
  daftar_gangguan: ["nama", "keterangan", "kontak", "tanggal_mulai", "follow_up", "hasil_fu"],
  gangguan: ["tanggal", "kategori", "pelanggan", "alamat", "status", "keterangan", "user_terdampak"],
  leads: [
    "nama",
    "sumber",
    "status",
    "tanggal",
    "telepon",
    "alamat",
    "odp_terdekat",
    "jarak_odp",
    "lat",
    "lng",
    "redaman",
    "biaya_kabel",
    "keterangan_survey",
  ],
  tim: ["nama"],
  odp_odc: ["odc", "nama", "keterangan", "status", "port_kapasitas", "port_terpakai"],
  pengajuan_pemutusan: ["nama", "kontak", "alasan", "tanggal"],
  pelanggan_radius: [
    "id_pelanggan",
    "nama",
    "telepon",
    "alamat",
    "odp",
    "paket",
    "status",
    "ip_address",
    "tgl_daftar",
  ],
};

function sanitizeForTable(tableName, row, useBaseColumnsOnly = false) {
  let allowed = ALLOWED_COLUMNS[tableName];
  if (tableName === "pekerjaan" && useBaseColumnsOnly) {
    allowed = BASE_PEKERJAAN_COLUMNS;
  }
  if (!allowed) return row;
  const clean = {};
  for (const col of allowed) {
    if (row[col] !== undefined) {
      clean[col] = row[col];
    }
  }

  // Safety guards for PostgreSQL check constraints & data types
  if (tableName === "leads") {
    const validStatus = ["BARU", "KONTAK", "DIJADWALKAN", "SELESAI"];
    if (clean.status && !validStatus.includes(clean.status)) {
      clean.status = "BARU";
    }
    const validSumber = ["IKLAN", "AFFILIATE", "MARKETING"];
    if (clean.sumber && !validSumber.includes(clean.sumber)) {
      clean.sumber = "IKLAN";
    }
    if (clean.jarak_odp !== undefined && clean.jarak_odp !== null) {
      const num = parseInt(clean.jarak_odp, 10);
      clean.jarak_odp = isNaN(num) ? null : num;
    }
    if (clean.lat !== undefined && clean.lat !== null) {
      const num = parseFloat(clean.lat);
      clean.lat = isNaN(num) ? null : num;
    }
    if (clean.lng !== undefined && clean.lng !== null) {
      const num = parseFloat(clean.lng);
      clean.lng = isNaN(num) ? null : num;
    }
  } else if (tableName === "odp_odc") {
    const validStatus = ["", "Aman", "Diperbaiki"];
    if (clean.status && !validStatus.includes(clean.status)) {
      clean.status = (clean.status || "").toLowerCase().includes("perbaik") ? "Diperbaiki" : "Aman";
    }
  } else if (tableName === "pekerjaan") {
    const validStatus = ["WAITING LIST", "DIJADWALKAN", "SELESAI", "GAGAL"];
    if (clean.status && !validStatus.includes(clean.status)) {
      clean.status = "WAITING LIST";
    }
    const validJenis = ["PEMASANGAN", "PERBAIKAN", "PEMUTUSAN", "PERBAIKAN KHUSUS (ODP/ODC)"];
    if (clean.jenis && !validJenis.includes(clean.jenis)) {
      clean.jenis = "PEMASANGAN";
    }
  } else if (tableName === "pelanggan_radius") {
    const validStatus = ["BARU", "AKTIF", "ISOLIR", "PUTUS"];
    if (clean.status && !validStatus.includes(clean.status)) {
      clean.status = "AKTIF";
    }
  }

  return clean;
}

function toCamel(row) {
  if (!row) return row;
  const out = { ...row };
  if (out.user_terdampak !== undefined) { out.userTerdampak = out.user_terdampak; delete out.user_terdampak; }
  if (out.tanggal_mulai !== undefined) { out.tanggalMulai = out.tanggal_mulai; delete out.tanggal_mulai; }
  if (out.follow_up !== undefined) { out.followUp = out.follow_up; delete out.follow_up; }
  if (out.hasil_fu !== undefined) { out.hasilFU = out.hasil_fu; delete out.hasil_fu; }
  delete out.created_at;
  return out;
}

function toSnake(row) {
  if (!row) return row;
  const out = { ...row };
  if (out.userTerdampak !== undefined) { out.user_terdampak = out.userTerdampak; delete out.userTerdampak; }
  if (out.tanggalMulai !== undefined) { out.tanggal_mulai = out.tanggalMulai; delete out.tanggalMulai; }
  if (out.followUp !== undefined) { out.follow_up = out.followUp; delete out.followUp; }
  if (out.hasilFU !== undefined) { out.hasil_fu = out.hasilFU; delete out.hasilFU; }
  delete out.id;
  delete out.created_at;
  delete out.pemasangan;
  delete out.perbaikan;
  delete out.pemutusan;
  return out;
}

// One-time automatic reset of local mock data caches to start with clean real data
const RESET_STORAGE_KEY = "xnet_reset_to_real_data_v4";
if (typeof window !== "undefined" && !localStorage.getItem(RESET_STORAGE_KEY)) {
  const keysToReset = [
    "xnet_pekerjaan",
    "xnet_leads",
    "xnet_gangguan",
    "xnet_daftar_gangguan_v2",
    "xnet_tim",
    "xnet_odpodc",
    "xnet_odc_list",
    "xnet_pengajuan_pemutusan",
  ];
  keysToReset.forEach((k) => localStorage.removeItem(k));
  localStorage.setItem(RESET_STORAGE_KEY, "done");
}

/**
 * Penyimpanan LocalStorage Aman dengan Proteksi Batas Kuota Browser (5MB limit)
 * - Mencegah crash jika kuota browser penuh saat upload foto teknisi
 * - Otomatis memangkas foto base64 pada tugas selesai lama (>7 hari) jika kuota menipis
 * - Menjaga data pekerjaan, tanggal, komisi, dan status tetap 100% utuh
 */
export function safeSetLocalStorage(key, value) {
  if (typeof window === "undefined" || !window.localStorage) return;
  const stringified = JSON.stringify(value);
  try {
    localStorage.setItem(key, stringified);
  } catch (err) {
    const isQuotaErr =
      err &&
      (err.name === "QuotaExceededError" ||
        err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        err.code === 22 ||
        err.code === 1014);

    if (isQuotaErr) {
      console.warn(`[STORAGE QUOTA] Kuota browser penuh saat menyimpan "${key}". Memulai auto-pruning foto riwayat...`);
      try {
        const rawPekerjaan = localStorage.getItem("xnet_pekerjaan");
        if (rawPekerjaan) {
          const list = JSON.parse(rawPekerjaan);
          if (Array.isArray(list)) {
            let prunedCount = 0;
            const now = Date.now();
            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

            const prunedList = list.map((task) => {
              const taskDate = task.tanggal ? new Date(task.tanggal).getTime() : 0;
              const isOldCompleted = task.status === "SELESAI" && (now - taskDate > sevenDaysMs || !taskDate);

              if (isOldCompleted) {
                const hadPhoto = task.foto_opm || task.foto_dropcore || task.foto_modem;
                if (hadPhoto) prunedCount++;
                return {
                  ...task,
                  foto_opm: typeof task.foto_opm === "string" && task.foto_opm.startsWith("data:") ? "[Tersimpan di Cloud/Lokal]" : task.foto_opm,
                  foto_dropcore: typeof task.foto_dropcore === "string" && task.foto_dropcore.startsWith("data:") ? "[Tersimpan di Cloud/Lokal]" : task.foto_dropcore,
                  foto_modem: typeof task.foto_modem === "string" && task.foto_modem.startsWith("data:") ? "[Tersimpan di Cloud/Lokal]" : task.foto_modem,
                  evidence: task.evidence
                    ? {
                        ...task.evidence,
                        foto_opm: typeof task.evidence.foto_opm === "string" && task.evidence.foto_opm.startsWith("data:") ? "[Cloud Backup]" : task.evidence.foto_opm,
                        foto_dropcore: typeof task.evidence.foto_dropcore === "string" && task.evidence.foto_dropcore.startsWith("data:") ? "[Cloud Backup]" : task.evidence.foto_dropcore,
                        foto_modem: typeof task.evidence.foto_modem === "string" && task.evidence.foto_modem.startsWith("data:") ? "[Cloud Backup]" : task.evidence.foto_modem,
                      }
                    : task.evidence,
                };
              }
              return task;
            });

            if (prunedCount > 0) {
              localStorage.setItem("xnet_pekerjaan", JSON.stringify(prunedList));
              console.info(`[STORAGE QUOTA] Berhasil membebaskan kuota dari ${prunedCount} foto tugas historis.`);
            }
          }
        }

        // Coba simpan kembali item target
        localStorage.setItem(key, stringified);
      } catch (retryErr) {
        console.error(`[STORAGE QUOTA] Gagal menyimpan item "${key}" bahkan setelah pruning:`, retryErr);
      }
    } else {
      console.warn(`usePersistState safeSetLocalStorage "${key}":`, err);
    }
  }
}

export function usePersistState(key, initialValue) {
  const table = TABLE_MAP[key];

  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const baselineStateRef = useRef(null);

  // Listen for storage events across tabs & custom events in the same tab (instant real-time sync)
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === key && e.newValue) {
        try {
          setState(JSON.parse(e.newValue));
        } catch {}
      }
    };
    const handleCustom = (e) => {
      if (e.detail?.key === key && e.detail?.value !== undefined) {
        setState(e.detail.value);
      }
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("xnet_storage_update", handleCustom);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("xnet_storage_update", handleCustom);
    };
  }, [key]);

  // On mount: fetch from Supabase and merge
  useEffect(() => {
    if (!table) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await db.fetchAll(table);
        if (cancelled || !rows) return;
        const camelRows = rows.map(toCamel);
        
        setState((current) => {
          const currentList = Array.isArray(current) ? current : [];
          // Keep only user-created pending items with timestamp IDs
          const localOnly = currentList.filter((r) => r.id >= 1000000000000);
          
          // Merge remote rows with local, keeping any local frontend-only attributes (e.g. odp, userTerdampak)
          const mergedRemote = camelRows.map((remote) => {
            const local = currentList.find((c) => c.id === remote.id);
            return local ? { ...local, ...remote } : remote;
          });

          const merged = [...mergedRemote, ...localOnly];
          localStorage.setItem(key, JSON.stringify(merged));
          window.dispatchEvent(new CustomEvent("xnet_storage_update", { detail: { key, value: merged } }));
          return merged;
        });
      } catch (err) {
        console.warn(`usePersistState fetch ${key}:`, err);
      }
    })();
    return () => { cancelled = true; };
  }, [table, key]);

  // Real-time subscription to Supabase postgres_changes
  useEffect(() => {
    if (!table) return;
    let channel = null;

    try {
      // Use unique channel identifier to prevent subscription collisions across concurrent components
      const channelId = `rt_${table}_${key}_${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: table },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const newItem = toCamel(payload.new);
              setState((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                if (list.some((r) => r.id === newItem.id)) return prev;
                const next = [newItem, ...list];
                safeSetLocalStorage(key, next);
                window.dispatchEvent(new CustomEvent("xnet_storage_update", { detail: { key, value: next } }));
                return next;
              });
            } else if (payload.eventType === "UPDATE") {
              const updatedItem = toCamel(payload.new);
              setState((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                const next = list.map((r) => (r.id === updatedItem.id ? { ...r, ...updatedItem } : r));
                safeSetLocalStorage(key, next);
                window.dispatchEvent(new CustomEvent("xnet_storage_update", { detail: { key, value: next } }));
                return next;
              });
            } else if (payload.eventType === "DELETE") {
              const deletedId = payload.old?.id;
              if (deletedId) {
                setState((prev) => {
                  const list = Array.isArray(prev) ? prev : [];
                  const next = list.filter((r) => r.id !== deletedId);
                  safeSetLocalStorage(key, next);
                  window.dispatchEvent(new CustomEvent("xnet_storage_update", { detail: { key, value: next } }));
                  return next;
                });
              }
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn(`usePersistState realtime subscribe ${key}:`, err);
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (e) {
          // ignore
        }
      }
    };
  }, [table, key]);

  // Persist to localStorage on change safely
  useEffect(() => {
    safeSetLocalStorage(key, state);
  }, [key, state]);

  // Smart Sync to Supabase: handles insert, update, and delete cleanly without schema error
  const syncTimer = useRef(null);
  const syncToSupabase = useCallback((prevRows, newState) => {
    if (!table || !Array.isArray(newState)) return;
    if (!baselineStateRef.current) {
      baselineStateRef.current = prevRows || [];
    }
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      try {
        const base = baselineStateRef.current || [];
        baselineStateRef.current = null;

        const prevMap = new Map(base.map((r) => [r.id, r]));
        const nextIds = new Set(newState.map((r) => r.id));

        // 1. Deleted items
        const deletedRows = base.filter((r) => !nextIds.has(r.id) && r.id < 1000000000000);
        for (const d of deletedRows) {
          try {
            await db.remove(table, d.id);
          } catch (e) {
            console.warn(`[SYNC] Remove ${table} id=${d.id} error:`, e.message);
          }
        }

        // 2. Added items (new client items have temporary Date.now() timestamp IDs)
        const addedRows = newState.filter((r) => r.id >= 1000000000000);
        for (const a of addedRows) {
          try {
            const snake = sanitizeForTable(table, toSnake(a));
            const inserted = await db.insert(table, snake);
            if (inserted && inserted.id) {
              setState((current) => {
                const updated = (current || []).map((row) => (row.id === a.id ? { ...row, id: inserted.id } : row));
                safeSetLocalStorage(key, updated);
                window.dispatchEvent(new CustomEvent("xnet_storage_update", { detail: { key, value: updated } }));
                return updated;
              });
            }
          } catch (e) {
            // Auto fallback jika database Supabase belum menjalankan SQL migrasi kolom extended
            if (table === "pekerjaan" && e.message && /column.*does not exist/i.test(e.message)) {
              try {
                const baseSnake = sanitizeForTable(table, toSnake(a), true);
                const inserted = await db.insert(table, baseSnake);
                if (inserted && inserted.id) {
                  setState((current) => {
                    const updated = (current || []).map((row) => (row.id === a.id ? { ...row, id: inserted.id } : row));
                    safeSetLocalStorage(key, updated);
                    window.dispatchEvent(new CustomEvent("xnet_storage_update", { detail: { key, value: updated } }));
                    return updated;
                  });
                }
              } catch (innerErr) {
                console.warn(`[SYNC] Insert ${table} fallback error:`, innerErr.message);
              }
            } else {
              console.warn(`[SYNC] Insert ${table} error:`, e.message);
            }
          }
        }

        // 3. Updated items
        const updatedRows = newState.filter((r) => {
          if (r.id >= 1000000000000) return false;
          const old = prevMap.get(r.id);
          return !old || JSON.stringify(old) !== JSON.stringify(r);
        });
        for (const u of updatedRows) {
          try {
            const snake = sanitizeForTable(table, toSnake(u));
            await db.update(table, u.id, snake);
          } catch (e) {
            // Auto fallback jika database Supabase belum menjalankan SQL migrasi kolom extended
            if (table === "pekerjaan" && e.message && /column.*does not exist/i.test(e.message)) {
              try {
                const baseSnake = sanitizeForTable(table, toSnake(u), true);
                await db.update(table, u.id, baseSnake);
              } catch (innerErr) {
                console.warn(`[SYNC] Update ${table} fallback error:`, innerErr.message);
              }
            } else {
              console.warn(`[SYNC] Update ${table} id=${u.id} error:`, e.message);
            }
          }
        }
      } catch (err) {
        console.warn(`usePersistState sync ${key}:`, err);
      }
    }, 400);
  }, [table, key]);

  const setPersistState = useCallback((updater) => {
    setState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      safeSetLocalStorage(key, next);
      window.dispatchEvent(new CustomEvent("xnet_storage_update", { detail: { key, value: next } }));
      syncToSupabase(prev, next);
      return next;
    });
  }, [key, syncToSupabase]);

  return [state, setPersistState];
}
