/**
 * Utilitas Otomatisasi Sinkronisasi Pelanggan Radius & Port ODP
 * Ketika pekerjaan lapangan berstatus 'SELESAI':
 * - PEMASANGAN: Buat / Aktifkan pelanggan di tabel pelanggan_radius (mengisi 1 port ODP)
 * - PEMUTUSAN: Ubah status pelanggan menjadi 'PUTUS' (membebaskan 1 port ODP)
 */

export function syncCustomerOnTaskCompletion(task, pelangganList = [], setPelangganList) {
  if (!task || !setPelangganList) return null;

  const jenis = (task.jenis || "").toUpperCase();
  const namaTarget = (task.pelanggan || "").trim();
  const odpTarget = (task.odp || "").trim();

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
      // Buat pelanggan baru di tabel pelanggan_radius
      const newCust = {
        id: Date.now(),
        id_pelanggan: `NX-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`,
        nama: namaTarget,
        telepon: task.telepon || "0812" + Math.floor(10000000 + Math.random() * 90000000),
        alamat: task.alamat || "Alamat baru terpasang",
        odp: odpTarget || "ODP 1.1",
        paket: "Home Fiber 20 Mbps",
        status: "AKTIF",
        ip_address: `10.20.${Math.floor(1 + Math.random() * 5)}.${Math.floor(10 + Math.random() * 200)}`,
        tgl_daftar: task.tanggal || new Date().toISOString().split("T")[0],
      };
      const newList = [newCust, ...currentList];
      setPelangganList(newList);
      return {
        type: "CREATED",
        message: `Pelanggan baru "${namaTarget}" otomatis terdaftar di Pelanggan Radius (${newCust.odp}) dan mengisi 1 port.`,
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
