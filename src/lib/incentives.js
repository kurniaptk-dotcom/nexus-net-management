// Sistem Kalkulasi Insentif, Komisi & Bonus Teknisi Nexus Net
// Berdasarkan Tabel Resmi Komisi Pekerjaan Team Nexus

export const KOMISI_PEKERJAAN_MASTER = [
  {
    id: "tarik_odp_odc",
    nama: "Tarik Kabel ODP/ODC + Fastcont",
    tarif: 200,
    satuan: "Meter",
    kategori: "ODP",
    keterangan: "Pemasangan kabel feeder / distribusi antar ODP/ODC",
  },
  {
    id: "penarikan_ulang",
    nama: "Penarikan Ulang",
    tarif: 200,
    satuan: "Meter",
    kategori: "PERBAIKAN",
    keterangan: "Tarik ulang kabel jalur eksisting yang rusak / putus",
  },
  {
    id: "rakit_odp_odc",
    nama: "Rakit ODP/ODC",
    tarif: 7500,
    satuan: "Unit",
    kategori: "ODP",
    keterangan: "Perakitan boks, splitter & pigtail ODP/ODC baru",
  },
  {
    id: "pasang_odp_odc",
    nama: "Pasang ODP/ODC",
    tarif: 5000,
    satuan: "Unit",
    kategori: "ODP",
    keterangan: "Pemasangan boks ODP/ODC pada tiang distribusi",
  },
  {
    id: "tarik_pelanggan_baru",
    nama: "Penarikan Kabel Pelanggan Baru + Fastcont",
    tarif: 100,
    satuan: "Meter",
    kategori: "PEMASANGAN",
    keterangan: "Tarik kabel dropcore dari ODP ke rumah pelanggan baru",
  },
  {
    id: "pasang_modem",
    nama: "Pemasangan Modem ke Pelanggan",
    tarif: 5000,
    satuan: "Unit",
    kategori: "PEMASANGAN",
    keterangan: "Instalasi dan terminasi unit modem ONT pelanggan",
  },
  {
    id: "sambung_kabel",
    nama: "Sambung Kabel",
    tarif: 5000,
    satuan: "Unit",
    kategori: "PERBAIKAN",
    keterangan: "Penyambungan core fiber (splicing / mekanik)",
  },
  {
    id: "setting_modem",
    nama: "Setting Modem Pelanggan",
    tarif: 3000,
    satuan: "User",
    kategori: "PEMASANGAN",
    keterangan: "Konfigurasi PPPoE, WiFi SSID & password pelanggan",
  },
  {
    id: "perbaikan_fastcont",
    nama: "Perbaikan Fastcont Pelanggan",
    tarif: 3500,
    satuan: "User",
    kategori: "PERBAIKAN",
    keterangan: "Penggantian / pemasangan ulang konektor fast connector",
  },
  {
    id: "perbaikan_modem",
    nama: "Perbaikan Modem Pelanggan",
    tarif: 3000,
    satuan: "Unit",
    kategori: "PERBAIKAN",
    keterangan: "Troubleshoot / ganti adaptor / reset modem pelanggan",
  },
  {
    id: "perbaikan_odp_odc",
    nama: "Perbaikan ODP/ODC + Fastcont",
    tarif: 10000,
    satuan: "Unit",
    kategori: "ODP",
    keterangan: "Perbaikan menyeluruh boks ODP/ODC & konektor tiang",
  },
  {
    id: "pemutusan_dismantle",
    nama: "Pemutusan / Dismantle Perangkat",
    tarif: 5000,
    satuan: "Unit",
    kategori: "PEMUTUSAN",
    keterangan: "Penarikan modem & pelepasan port dropcore pelanggan non-aktif",
  },
];

// Helper: Map id ke item master
export const KOMISI_MAP = KOMISI_PEKERJAAN_MASTER.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {});

// Default Config Tarif & Bonus
export const DEFAULT_INCENTIVE_CONFIG = {
  itemRates: KOMISI_PEKERJAAN_MASTER.reduce((acc, item) => {
    acc[item.id] = item.tarif;
    return acc;
  }, {}),
  tariffs: {
    PEMASANGAN: 18000,
    PERBAIKAN: 5000,
    PEMUTUSAN: 5000,
    "PERBAIKAN KHUSUS (ODP/ODC)": 10000,
  },
  // Kualitas redaman dinonaktifkan sesuai arahan kebijakan manajemen
  qualityBonus: {
    enabled: false,
    amount: 0,
    minDbm: 15.0,
    maxDbm: 22.99,
  },
  tierTargets: [
    { id: "silver", targetCount: 25, bonusAmount: 100000, label: "Target Silver (25 Tugas)" },
    { id: "gold", targetCount: 40, bonusAmount: 250000, label: "Target Gold (40 Tugas)" },
  ],
};

export const STORAGE_KEY_MASTER_KOMISI = "xnet_master_komisi";
export const MASTER_KOMISI_ITEMS = KOMISI_PEKERJAAN_MASTER;

export const KATEGORI_KOMISI = [
  { key: "PEMASANGAN", label: "Pemasangan Baru", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "PERBAIKAN", label: "Perbaikan & Gangguan", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "ODP", label: "Distribusi (ODP / ODC)", badge: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "PEMUTUSAN", label: "Pemutusan / Dismantle", badge: "bg-rose-50 text-rose-700 border-rose-200" },
];

export function normalizeJobCategory(jenis) {
  if (!jenis) return "PEMASANGAN";
  const upper = String(jenis).toUpperCase();
  if (upper.includes("ODP") || upper.includes("ODC")) return "ODP";
  if (upper.includes("PUTUS") || upper.includes("DISMANTLE")) return "PEMUTUSAN";
  if (upper.includes("BAIK") || upper.includes("GANGGUAN")) return "PERBAIKAN";
  return "PEMASANGAN";
}

// Helper: Ambil item master berdasarkan kategori
export function getWorkItemsByCategory(category, masterList = KOMISI_PEKERJAAN_MASTER) {
  const norm = normalizeJobCategory(category);
  return (masterList || []).filter((item) => {
    const itemCat = normalizeJobCategory(item.kategori);
    return itemCat === norm;
  });
}

// Helper: Dapatkan item default yang direkomendasikan saat membuat / menyelesaikan tugas
export function getDefaultWorkItemsForTask(jenis, defaultMeter = 100, masterList = KOMISI_PEKERJAAN_MASTER) {
  const norm = normalizeJobCategory(jenis);
  const map = (masterList || []).reduce((acc, it) => {
    acc[it.id] = it;
    return acc;
  }, {});

  let itemIds = [];
  switch (norm) {
    case "PEMASANGAN":
      itemIds = [
        { id: "tarik_pelanggan_baru", qty: defaultMeter },
        { id: "pasang_modem", qty: 1 },
        { id: "setting_modem", qty: 1 },
      ];
      break;
    case "PEMUTUSAN":
      itemIds = [{ id: "pemutusan_dismantle", qty: 1 }];
      break;
    case "ODP":
      itemIds = [{ id: "perbaikan_odp_odc", qty: 1 }];
      break;
    case "PERBAIKAN":
      itemIds = [{ id: "perbaikan_fastcont", qty: 1 }];
      break;
    default:
      itemIds = [];
  }

  return itemIds
    .map((item) => {
      const m = map[item.id];
      if (!m) return null;
      return {
        id: item.id,
        nama: m.nama,
        satuan: m.satuan,
        tarif: m.tarif,
        qty: item.qty,
        subtotal: m.tarif * item.qty,
      };
    })
    .filter(Boolean);
}

// Helper: Hitung total komisi dari array items
export function calculateKomisiItemsTotal(items = [], masterList = KOMISI_PEKERJAAN_MASTER) {
  if (!Array.isArray(items) || items.length === 0) return 0;
  const map = (masterList || []).reduce((acc, it) => {
    acc[it.id] = it;
    return acc;
  }, {});

  return items.reduce((sum, it) => {
    const rate = it.tarif !== undefined && it.tarif !== null
      ? Number(it.tarif)
      : (map[it.id]?.tarif || 0);
    const qty = Number(it.qty) || 0;
    return sum + (rate * qty);
  }, 0);
}

// Helper: Format Rupiah
export function formatRupiah(amount) {
  if (typeof amount !== "number" || isNaN(amount)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Helper: Ekstrak nilai dBm dari string keterangan pekerjaan
export function extractDbmFromKeterangan(keterangan = "") {
  if (!keterangan) return null;
  const match = keterangan.match(/(-?\d+(\.\d+)?)\s*dBm/i);
  if (match && match[1]) {
    const val = parseFloat(match[1]);
    return isNaN(val) ? null : val;
  }
  return null;
}

// Helper: Evaluasi kualitas redaman optik dBm (untuk indikator SOP visual)
export function getDbmQuality(val) {
  if (val === null || val === undefined || isNaN(val)) return null;
  const abs = Math.abs(val);
  if (abs >= 15.0 && abs <= 22.99) {
    return {
      status: "PRIMA",
      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
      badge: "Prima (-15 s/d -22.9 dBm)",
      isBonusEligible: false,
    };
  }
  if (abs < 15.0) {
    return {
      status: "TERLALU_KUAT",
      color: "text-amber-700 bg-amber-50 border-amber-200",
      badge: "Terlalu Kuat (< -15 dBm)",
      isBonusEligible: false,
    };
  }
  if (abs <= 25.0) {
    return {
      status: "WASPADA",
      color: "text-amber-700 bg-amber-50 border-amber-200",
      badge: "Waspada (-23 s/d -25 dBm)",
      isBonusEligible: false,
    };
  }
  return {
    status: "BURUK",
    color: "text-rose-700 bg-rose-50 border-rose-200",
    badge: "Redaman Buruk (> -25 dBm)",
    isBonusEligible: false,
  };
}

// Hitung komisi untuk 1 pekerjaan
export function calculateTaskIncentive(task, config = DEFAULT_INCENTIVE_CONFIG, masterList = KOMISI_PEKERJAAN_MASTER) {
  if (!task || task.status !== "SELESAI") {
    return {
      baseFee: 0,
      qualityBonus: 0,
      total: 0,
      hasQualityBonus: false,
      redaman: null,
      items: [],
    };
  }

  const activeMaster = Array.isArray(masterList) && masterList.length > 0 ? masterList : KOMISI_PEKERJAAN_MASTER;
  const masterMap = activeMaster.reduce((acc, it) => {
    acc[it.id] = it;
    return acc;
  }, {});

  const masterRates = activeMaster.reduce((acc, it) => {
    if (it.tarif !== undefined && it.tarif !== null) {
      acc[it.id] = Number(it.tarif);
    }
    return acc;
  }, {});

  // Master Komisi adalah Single Source of Truth
  const activeRates = {
    ...DEFAULT_INCENTIVE_CONFIG.itemRates,
    ...(config?.itemRates || {}),
    ...masterRates,
  };

  let totalItemFee = 0;
  let itemBreakdown = [];

  // 1. Cek apakah task memiliki rincian komisi_items eksplisit
  if (Array.isArray(task.komisi_items) && task.komisi_items.length > 0) {
    itemBreakdown = task.komisi_items
      .map((item) => {
        const master = masterMap[item.id] || KOMISI_MAP[item.id] || {
          nama: item.nama || item.id,
          satuan: item.satuan || "Unit",
          tarif: item.tarif || 0,
        };
        const rate = item.tarif !== undefined && item.tarif !== null
          ? Number(item.tarif)
          : (activeRates[item.id] !== undefined ? activeRates[item.id] : (master.tarif || 0));
        const qty = Number(item.qty) || 0;
        const subtotal = rate * qty;
        totalItemFee += subtotal;

        return {
          id: item.id,
          nama: master.nama,
          satuan: master.satuan,
          tarif: rate,
          qty,
          subtotal,
        };
      })
      .filter((i) => i.qty > 0);
  } else if (task.komisi_total !== undefined && task.komisi_total !== null && !isNaN(Number(task.komisi_total))) {
    // Jika ada komisi_total langsung
    totalItemFee = Number(task.komisi_total);
  } else {
    // 2. Fallback jika data lama / belum ada rincian item:
    // Gunakan preset sesuai jenis tugas
    const defaultItems = getDefaultWorkItemsForTask(task.jenis, 100, activeMaster);
    if (defaultItems.length > 0) {
      itemBreakdown = defaultItems.map((item) => {
        const master = masterMap[item.id] || KOMISI_MAP[item.id];
        const rate = activeRates[item.id] !== undefined ? activeRates[item.id] : (master?.tarif || 0);
        const qty = item.qty;
        const subtotal = rate * qty;
        totalItemFee += subtotal;
        return {
          id: item.id,
          nama: master?.nama || item.id,
          satuan: master?.satuan || "Unit",
          tarif: rate,
          qty,
          subtotal,
        };
      });
    } else {
      totalItemFee = config.tariffs?.[task.jenis] || 5000;
    }
  }

  // Bonus Kualitas Redaman (0 / Disabled sesuai ketentuan manajemen)
  let qualityBonus = 0;
  let hasQualityBonus = false;

  let dbm = null;
  if (task.redaman !== undefined && task.redaman !== null && task.redaman !== "") {
    const parsed = parseFloat(task.redaman);
    if (!isNaN(parsed)) dbm = parsed;
  }
  if (dbm === null) {
    dbm = extractDbmFromKeterangan(task.keterangan);
  }

  if (config?.qualityBonus?.enabled && dbm !== null) {
    const abs = Math.abs(dbm);
    if (abs >= config.qualityBonus.minDbm && abs <= config.qualityBonus.maxDbm) {
      qualityBonus = config.qualityBonus.amount || 0;
      hasQualityBonus = qualityBonus > 0;
    }
  }

  return {
    baseFee: totalItemFee,
    qualityBonus,
    total: totalItemFee + qualityBonus,
    hasQualityBonus,
    redaman: dbm,
    items: itemBreakdown,
  };
}

// Hitung rekapitulasi seluruh insentif tim
export function calculateTeamIncentives(tasks = [], teamName = "ALL", config = DEFAULT_INCENTIVE_CONFIG, masterList = KOMISI_PEKERJAAN_MASTER) {
  const filteredTasks = tasks.filter((t) => {
    if (t.status !== "SELESAI") return false;
    if (teamName === "ALL") return true;
    return (t.tim || "").toUpperCase() === teamName.toUpperCase();
  });

  let totalBaseFee = 0;
  let totalQualityBonus = 0;
  let primaCount = 0;

  // Akumulasi per item master
  const activeMaster = Array.isArray(masterList) && masterList.length > 0 ? masterList : KOMISI_PEKERJAAN_MASTER;
  const itemsAggregated = {};
  activeMaster.forEach((m) => {
    const effectiveTarif = (m.tarif !== undefined && m.tarif !== null)
      ? Number(m.tarif)
      : (config?.itemRates?.[m.id] !== undefined ? Number(config.itemRates[m.id]) : 0);

    itemsAggregated[m.id] = {
      ...m,
      tarif: effectiveTarif,
      totalQty: 0,
      totalAmount: 0,
      taskCount: 0,
    };
  });

  const taskBreakdown = filteredTasks.map((t) => {
    const calc = calculateTaskIncentive(t, config, activeMaster);
    totalBaseFee += calc.baseFee;
    totalQualityBonus += calc.qualityBonus;
    if (calc.hasQualityBonus) primaCount++;

    // Akumulasi rincian item
    if (Array.isArray(calc.items)) {
      calc.items.forEach((it) => {
        if (itemsAggregated[it.id]) {
          itemsAggregated[it.id].totalQty += it.qty;
          itemsAggregated[it.id].totalAmount += it.subtotal;
          itemsAggregated[it.id].taskCount += 1;
        }
      });
    }

    return {
      ...t,
      incentive: calc,
    };
  });

  const totalCompleted = filteredTasks.length;

  // Cek pencapaian target bulanan
  let activeTierBonus = 0;
  let achievedTierLabel = null;
  let nextTier = null;

  const sortedTiers = [...(config?.tierTargets || [])].sort((a, b) => b.targetCount - a.targetCount);

  for (const tier of sortedTiers) {
    if (totalCompleted >= tier.targetCount) {
      activeTierBonus = tier.bonusAmount;
      achievedTierLabel = tier.label;
      break;
    }
  }

  // Tentukan target berikutnya
  const upcomingTiers = [...(config?.tierTargets || [])].sort((a, b) => a.targetCount - b.targetCount);
  for (const tier of upcomingTiers) {
    if (totalCompleted < tier.targetCount) {
      nextTier = {
        ...tier,
        remainingCount: tier.targetCount - totalCompleted,
        progressPercent: Math.min(100, Math.round((totalCompleted / tier.targetCount) * 100)),
      };
      break;
    }
  }

  const grandTotal = totalBaseFee + totalQualityBonus + activeTierBonus;

  return {
    totalCompleted,
    totalBaseFee,
    totalQualityBonus,
    primaCount,
    activeTierBonus,
    achievedTierLabel,
    nextTier,
    grandTotal,
    breakdown: taskBreakdown,
    itemsAggregated: Object.values(itemsAggregated).filter((item) => item.totalQty > 0),
  };
}
