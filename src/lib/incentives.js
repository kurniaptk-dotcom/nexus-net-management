// Sistem Kalkulasi Insentif, Fee & Bonus Teknisi Nexus Net

export const DEFAULT_INCENTIVE_CONFIG = {
  tariffs: {
    PEMASANGAN: 75000,
    PERBAIKAN: 30000,
    PEMUTUSAN: 20000,
    "PERBAIKAN KHUSUS (ODP/ODC)": 50000,
  },
  qualityBonus: {
    enabled: true,
    amount: 5000, // Bonus tambahan jika redaman optik prima
    minDbm: 15.0,
    maxDbm: 22.99,
  },
  tierTargets: [
    { id: "silver", targetCount: 25, bonusAmount: 100000, label: "Target Silver (25 Tugas)" },
    { id: "gold", targetCount: 40, bonusAmount: 250000, label: "Target Gold (40 Tugas)" },
  ],
};

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
  // Cari pola "Redaman: -19.5 dBm" atau "-19.5 dBm"
  const match = keterangan.match(/(-?\d+(\.\d+)?)\s*dBm/i);
  if (match && match[1]) {
    const val = parseFloat(match[1]);
    return isNaN(val) ? null : val;
  }
  return null;
}

// Hitung insentif untuk 1 pekerjaan
export function calculateTaskIncentive(task, config = DEFAULT_INCENTIVE_CONFIG) {
  if (!task || task.status !== "SELESAI") {
    return {
      baseFee: 0,
      qualityBonus: 0,
      total: 0,
      hasQualityBonus: false,
      redaman: null,
    };
  }

  const baseTariff = config.tariffs[task.jenis] || config.tariffs.PEMASANGAN || 50000;
  let qualityBonus = 0;
  let hasQualityBonus = false;

  const dbm = extractDbmFromKeterangan(task.keterangan);
  if (dbm !== null && config.qualityBonus.enabled) {
    const abs = Math.abs(dbm);
    if (abs >= config.qualityBonus.minDbm && abs <= config.qualityBonus.maxDbm) {
      qualityBonus = config.qualityBonus.amount;
      hasQualityBonus = true;
    }
  }

  return {
    baseFee: baseTariff,
    qualityBonus,
    total: baseTariff + qualityBonus,
    hasQualityBonus,
    redaman: dbm,
  };
}

// Hitung rekapitulasi seluruh insentif tim
export function calculateTeamIncentives(tasks = [], teamName = "ALL", config = DEFAULT_INCENTIVE_CONFIG) {
  const filteredTasks = tasks.filter((t) => {
    if (t.status !== "SELESAI") return false;
    if (teamName === "ALL") return true;
    return (t.tim || "").toUpperCase() === teamName.toUpperCase();
  });

  let totalBaseFee = 0;
  let totalQualityBonus = 0;
  let primaCount = 0;

  const taskBreakdown = filteredTasks.map((t) => {
    const calc = calculateTaskIncentive(t, config);
    totalBaseFee += calc.baseFee;
    totalQualityBonus += calc.qualityBonus;
    if (calc.hasQualityBonus) primaCount++;

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

  const sortedTiers = [...(config.tierTargets || [])].sort((a, b) => b.targetCount - a.targetCount);

  for (const tier of sortedTiers) {
    if (totalCompleted >= tier.targetCount) {
      activeTierBonus = tier.bonusAmount;
      achievedTierLabel = tier.label;
      break;
    }
  }

  // Tentukan target berikutnya
  const upcomingTiers = [...(config.tierTargets || [])].sort((a, b) => a.targetCount - b.targetCount);
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
  };
}
