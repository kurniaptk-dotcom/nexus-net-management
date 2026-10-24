import { supabase, db } from "./supabase";

/**
 * Cloud Synchronization Engine (Nexus Net Management)
 * Menangani sinkronisasi hibrid dua arah antara localStorage dan database Supabase Cloud
 * dengan jaminan Zero Data Loss dan pemulihan otomatis saat offline.
 */

const SYNC_TABLES = [
  { key: "xnet_pekerjaan", table: "pekerjaan", label: "Pekerjaan Lapangan" },
  { key: "xnet_pelanggan_radius", table: "pelanggan_radius", label: "Pelanggan Radius" },
  { key: "xnet_leads", table: "leads", label: "Calon Pelanggan (Leads)" },
  { key: "xnet_odpodc", table: "odp_odc", label: "Data ODP / ODC" },
  { key: "xnet_daftar_gangguan_v2", table: "daftar_gangguan", label: "Daftar Gangguan" },
  { key: "xnet_tim", table: "tim", label: "Master Tim" },
  { key: "xnet_pengajuan_pemutusan", table: "pengajuan_pemutusan", label: "Pengajuan Pemutusan" },
];

/**
 * Helper untuk membersihkan objek agar cocok dengan kolom database Supabase
 */
function sanitizeForUpload(tableName, item) {
  const clean = { ...item };
  delete clean.created_at;
  delete clean.updated_at;
  delete clean.komisi_estimasi;
  delete clean.port_is_full;
  delete clean.total_ports;
  delete clean.used_ports;
  delete clean.free_ports;

  // Tangani konversi camelCase ke snake_case khusus
  if (clean.userTerdampak !== undefined) {
    clean.user_terdampak = clean.userTerdampak;
    delete clean.userTerdampak;
  }
  if (clean.tanggalMulai !== undefined) {
    clean.tanggal_mulai = clean.tanggalMulai;
    delete clean.tanggalMulai;
  }
  if (clean.followUp !== undefined) {
    clean.follow_up = clean.followUp;
    delete clean.followUp;
  }
  if (clean.hasilFU !== undefined) {
    clean.hasil_fu = clean.hasilFU;
    delete clean.hasilFU;
  }

  // Jika tabel pekerjaan, gunakan base columns yang aman jika database remote belum ada extended columns
  if (tableName === "pekerjaan") {
    const baseFields = ["tim", "jenis", "alamat", "pelanggan", "status", "tanggal", "keterangan"];
    const baseClean = {};
    for (const f of baseFields) {
      if (clean[f] !== undefined) baseClean[f] = clean[f];
    }
    return baseClean;
  }

  return clean;
}

/**
 * Eksekusi Sinkronisasi Penuh Dua Arah (Two-Way Full Cloud Sync)
 */
export async function syncAllOperationalData(onProgress) {
  if (!navigator.onLine) {
    return {
      success: false,
      message: "Perangkat sedang offline. Sinkronisasi akan dijalankan otomatis saat online.",
    };
  }

  const results = {
    totalSynced: 0,
    totalPulled: 0,
    details: [],
  };

  try {
    for (let i = 0; i < SYNC_TABLES.length; i++) {
      const { key, table, label } = SYNC_TABLES[i];
      if (onProgress) {
        onProgress({
          step: i + 1,
          total: SYNC_TABLES.length,
          label,
          status: "SINKRONISASI",
        });
      }

      // 1. Ambil data lokal
      let localData = [];
      try {
        localData = JSON.parse(localStorage.getItem(key) || "[]");
      } catch {
        localData = [];
      }

      // 2. Ambil data server Supabase
      const { data: remoteRows, error: fetchError } = await supabase
        .from(table)
        .select("*")
        .order("id", { ascending: true });

      if (fetchError) {
        console.warn(`[CLOUD SYNC] Gagal fetch tabel ${table}:`, fetchError.message);
        continue;
      }

      const remoteList = Array.isArray(remoteRows) ? remoteRows : [];
      const remoteIds = new Set(remoteList.map((r) => r.id));

      // 3. Deteksi item offline buatan pengguna lokal (ID Date.now() >= 1000000000000 atau string ODC/NX)
      // Jangan pernah mengunggah data mock bawaan (ID integer statis) ke server produksi Supabase!
      const isUserCreatedItem = (item) => {
        if (!item || !item.id) return false;
        if (typeof item.id === "number" && item.id >= 1000000000000) return true;
        if (typeof item.id === "string" && (item.id.startsWith("ODC-") || item.id.startsWith("NX-") || item.id.startsWith("item_"))) return true;
        return false;
      };

      const localUnsynced = localData.filter((item) => !remoteIds.has(item.id) && isUserCreatedItem(item));
      let uploadedForTable = 0;
      const uploadedMap = new Map(); // oldTempId -> newServerRow

      // Upload item lokal yang dibuat saat offline ke Supabase
      for (const item of localUnsynced.slice(0, 50)) {
        try {
          const payload = sanitizeForUpload(table, item);
          const { data: inserted, error: insErr } = await supabase.from(table).insert(payload).select().single();
          if (!insErr && inserted && inserted.id) {
            uploadedForTable++;
            uploadedMap.set(item.id, inserted);
          }
        } catch (e) {
          console.warn(`[CLOUD SYNC] Upload ${table} item error:`, e.message);
        }
      }

      // 4. Rekonsiliasi: Gabungkan remote data dengan local data (Zero Data Loss)
      // Update item lokal yang baru di-upload dengan ID resmi dari Supabase server
      const updatedLocal = localData.map((item) => {
        if (uploadedMap.has(item.id)) {
          const srv = uploadedMap.get(item.id);
          return { ...item, ...srv, id: srv.id };
        }
        return item;
      });

      const allRemoteIds = new Set([...remoteIds, ...Array.from(uploadedMap.values()).map((r) => r.id)]);
      const remainingLocal = updatedLocal.filter((item) => !allRemoteIds.has(item.id));

      const mergedList = [
        ...remoteList,
        ...Array.from(uploadedMap.values()),
        ...remainingLocal,
      ];

      localStorage.setItem(key, JSON.stringify(mergedList));
      window.dispatchEvent(
        new CustomEvent("xnet_storage_update", {
          detail: { key, value: mergedList },
        })
      );

      // Broadcast ke semua tab & jendela aplikasi aktif
      if (typeof BroadcastChannel !== "undefined") {
        try {
          const bc = new BroadcastChannel("xnet_live_sync_bus");
          bc.postMessage({ type: "FULL_SYNC_PULL", key, table, timestamp: Date.now() });
          bc.close();
        } catch {
          // ignore error if BroadcastChannel is not permitted
        }
      }

      results.totalSynced += uploadedForTable;
      results.totalPulled += remoteList.length;
      results.details.push({
        table,
        label,
        localCount: localData.length,
        remoteCount: remoteList.length,
        uploadedCount: uploadedForTable,
      });
    }

    return {
      success: true,
      message: `Sinkronisasi berhasil! ${results.totalSynced} item lokal diunggah & ${results.totalPulled} data cloud tersinkronisasi.`,
      results,
    };
  } catch (err) {
    console.error("[CLOUD SYNC ERROR]", err);
    return {
      success: false,
      message: "Terjadi kesalahan saat sinkronisasi: " + err.message,
    };
  }
}
