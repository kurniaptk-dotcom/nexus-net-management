import { db } from "./supabase.js";

/**
 * Utilitas Otomatisasi Sinkronisasi Pelanggan Radius, Tiket Gangguan, dan Leads
 * Ketika pekerjaan lapangan berstatus 'SELESAI':
 * 1. PEMASANGAN: Buat / Aktifkan pelanggan di tabel pelanggan_radius (mengisi 1 port ODP + auto-generate PPPoE credentials)
 * 2. PEMUTUSAN: Ubah status pelanggan menjadi 'PUTUS' (membebaskan 1 port ODP)
 * 3. GANGGUAN: Otomatis ubah tiket gangguan terkait menjadi status 'Aman' dengan catatan hasil perbaikan
 * 4. LEADS: Otomatis ubah status calon pelanggan menjadi 'SELESAI' dengan tanggal aktivasi
 */

/**
 * Helper untuk sinkronisasi tiket gangguan saat tugas selesai
 */
export function syncGangguanOnTaskCompletion(task) {
  if (!task || typeof window === "undefined") return null;

  try {
    const rawGangguan = localStorage.getItem("xnet_daftar_gangguan_v2");
    if (!rawGangguan) return null;

    const list = JSON.parse(rawGangguan);
    if (!Array.isArray(list)) return null;

    const targetName = (task.pelanggan || "").trim().toLowerCase();
    const targetSourceId = task.sourceId;
    const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    const redamanInfo = task.redaman && task.redaman !== "N/A" ? ` · Redaman: ${task.redaman} dBm` : "";
    const completionNote = `Selesai ditangani Tim ${task.tim || "Teknisi"}${redamanInfo} [${today}]`;

    let matched = false;
    const updatedList = list.map((g) => {
      if (!g) return g;
      const isMatch =
        (targetSourceId && (g.id === targetSourceId || String(g.id) === String(targetSourceId))) ||
        (targetName && (g.nama || "").trim().toLowerCase() === targetName);

      if (isMatch) {
        matched = true;
        // Background sync ke database Supabase
        if (g.id && typeof g.id === "number" && g.id < 1000000000000) {
          db.update("daftar_gangguan", g.id, {
            hasil_fu: "Aman",
            follow_up: completionNote,
          }).catch((err) => console.warn("[SYNC GANGGUAN DB] Error:", err.message));
        }

        return {
          ...g,
          hasilFU: "Aman",
          followUp: completionNote,
        };
      }
      return g;
    });

    if (matched) {
      localStorage.setItem("xnet_daftar_gangguan_v2", JSON.stringify(updatedList));
      window.dispatchEvent(
        new CustomEvent("xnet_storage_update", {
          detail: { key: "xnet_daftar_gangguan_v2", value: updatedList },
        })
      );
      console.info(`[CLOSED-LOOP SYNC] Tiket gangguan "${task.pelanggan}" otomatis diupdate ke "Aman".`);
      return true;
    }
  } catch (err) {
    console.warn("[CLOSED-LOOP SYNC GANGGUAN] Error:", err);
  }
  return false;
}

/**
 * Helper untuk sinkronisasi prospek Leads saat tugas PSB selesai
 */
export function syncLeadsOnTaskCompletion(task) {
  if (!task || typeof window === "undefined") return null;

  try {
    const rawLeads = localStorage.getItem("xnet_leads");
    if (!rawLeads) return null;

    const list = JSON.parse(rawLeads);
    if (!Array.isArray(list)) return null;

    const targetName = (task.pelanggan || "").trim().toLowerCase();
    const targetSourceId = task.sourceId;
    const todayIso = new Date().toISOString().split("T")[0];

    let matched = false;
    const updatedList = list.map((l) => {
      if (!l) return l;
      const isMatch =
        (targetSourceId && (l.id === targetSourceId || String(l.id) === String(targetSourceId))) ||
        (targetName && (l.nama || "").trim().toLowerCase() === targetName);

      if (isMatch) {
        matched = true;
        // Background sync ke database Supabase
        if (l.id && typeof l.id === "number" && l.id < 1000000000000) {
          db.update("leads", l.id, {
            status: "SELESAI",
            odp_terdekat: task.odp || l.odp_terdekat,
            redaman: task.redaman || l.redaman,
          }).catch((err) => console.warn("[SYNC LEADS DB] Error:", err.message));
        }

        return {
          ...l,
          status: "SELESAI",
          tgl_aktivasi: todayIso,
          odp_terdekat: task.odp || l.odp_terdekat,
          redaman: task.redaman || l.redaman,
          keterangan_survey: (l.keterangan_survey ? l.keterangan_survey + " · " : "") +
            `Terpasang & Aktif oleh Tim ${task.tim || "Teknisi"} (${task.spk_no || "SPK"})`,
        };
      }
      return l;
    });

    if (matched) {
      localStorage.setItem("xnet_leads", JSON.stringify(updatedList));
      window.dispatchEvent(
        new CustomEvent("xnet_storage_update", {
          detail: { key: "xnet_leads", value: updatedList },
        })
      );
      console.info(`[CLOSED-LOOP SYNC] Lead "${task.pelanggan}" otomatis diupdate ke "SELESAI".`);
      return true;
    }
  } catch (err) {
    console.warn("[CLOSED-LOOP SYNC LEADS] Error:", err);
  }
  return false;
}

export function syncCustomerOnTaskCompletion(task, pelangganList = [], setPelangganList) {
  if (!task || !setPelangganList) return null;

  const jenis = (task.jenis || "").toUpperCase();
  const namaTarget = (task.pelanggan || "").trim();
  const odpTarget = (task.odp || "").trim();

  // Eksekusi Closed-Loop Sync ke modul Gangguan dan Leads
  syncGangguanOnTaskCompletion(task);
  syncLeadsOnTaskCompletion(task);

  if (!namaTarget) return null;

  const currentList = Array.isArray(pelangganList) ? [...pelangganList] : [];

  // Cari apakah pelanggan sudah ada di daftar pelanggan radius
  // 1. Cek nomor telepon (sangat akurat)
  // 2. Cek nama persis (exact match case-insensitive)
  const taskPhone = (task.telepon || "").replace(/[^0-9]/g, "");
  const existingIndex = currentList.findIndex((p) => {
    if (!p) return false;
    const pPhone = (p.telepon || "").replace(/[^0-9]/g, "");
    if (taskPhone && pPhone && taskPhone.length >= 8 && pPhone.length >= 8) {
      if (taskPhone === pPhone || taskPhone.endsWith(pPhone.slice(-8)) || pPhone.endsWith(taskPhone.slice(-8))) {
        return true;
      }
    }
    const pNama = (p.nama || "").toLowerCase().trim();
    const tNama = namaTarget.toLowerCase().trim();
    return pNama === tNama;
  });

  const cleanNameForUser = namaTarget.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  const randomSuffix = Math.floor(100 + Math.random() * 900);

  if (jenis === "PEMASANGAN") {
    if (existingIndex >= 0) {
      // Update status menjadi AKTIF dan pastikan ODP terhubung
      const updatedCust = {
        ...currentList[existingIndex],
        status: "AKTIF",
        odp: odpTarget || currentList[existingIndex].odp || "ODP 1.1",
        alamat: task.alamat || currentList[existingIndex].alamat,
      };
      currentList[existingIndex] = updatedCust;
      setPelangganList(currentList);
      return {
        type: "ACTIVATED",
        message: `Pelanggan "${namaTarget}" otomatis diaktifkan di ${updatedCust.odp} (1 port terisi).`,
        customer: updatedCust,
      };
    } else {
      // Buat pelanggan baru di tabel pelanggan_radius dengan kredensial PPPoE auto-provisioning
      const newCust = {
        id: Date.now(),
        id_pelanggan: `NX-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`,
        nama: namaTarget,
        telepon: task.telepon || "0812" + Math.floor(10000000 + Math.random() * 90000000),
        alamat: task.alamat || "Alamat baru terpasang",
        odp: odpTarget || "ODP 1.1",
        paket: task.paket || "Home Fiber 20 Mbps",
        status: "AKTIF",
        ip_address: `10.20.${Math.floor(1 + Math.random() * 5)}.${Math.floor(10 + Math.random() * 200)}`,
        pppoe_user: `nx_${cleanNameForUser || "user"}_${randomSuffix}`,
        pppoe_pass: `nx${Math.floor(1000 + Math.random() * 9000)}`,
        tgl_daftar: task.tanggal || new Date().toISOString().split("T")[0],
      };
      const newList = [newCust, ...currentList];
      setPelangganList(newList);
      return {
        type: "CREATED",
        message: `Pelanggan baru "${namaTarget}" otomatis terdaftar di Pelanggan Radius (${newCust.odp}, user: ${newCust.pppoe_user}) dan mengisi 1 port.`,
        customer: newCust,
      };
    }
  } else if (jenis === "PEMUTUSAN") {
    if (existingIndex >= 0) {
      const prevOdp = currentList[existingIndex].odp || odpTarget;
      const updatedCust = {
        ...currentList[existingIndex],
        status: "PUTUS",
      };
      currentList[existingIndex] = updatedCust;
      setPelangganList(currentList);
      return {
        type: "DISCONNECTED",
        message: `Pelanggan "${namaTarget}" diubah ke status PUTUS. 1 port pada ${prevOdp || "ODP"} telah dibebaskan!`,
        customer: updatedCust,
      };
    } else {
      // Jika belum ada di list pelanggan, catat pelanggan dengan status PUTUS
      const newCust = {
        id: Date.now(),
        id_pelanggan: `NX-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`,
        nama: namaTarget,
        telepon: task.telepon || "-",
        alamat: task.alamat || "-",
        odp: odpTarget || "-",
        paket: "Berhenti Berlangganan",
        status: "PUTUS",
        ip_address: "-",
        tgl_daftar: task.tanggal || new Date().toISOString().split("T")[0],
      };
      setPelangganList([newCust, ...currentList]);
      return {
        type: "DISCONNECTED",
        message: `Pelanggan "${namaTarget}" dicatat berstatus PUTUS. Port ODP telah dibebaskan.`,
        customer: newCust,
      };
    }
  }

  return null;
}
