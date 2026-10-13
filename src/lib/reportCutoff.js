/**
 * Utilitas Evaluasi Batas Waktu Pelaporan Harian Teknisi (Cut-Off Pk 21:00 WIB / Jam 9 Malam)
 * Nexus Net Field Management
 */

// Jam batas cut-off (21:00 WIB = Jam 9 Malam)
export const CUTOFF_HOUR = 21;
export const CUTOFF_MINUTE = 0;

/**
 * Konversi timestamp ke jam dan menit lokal Indonesia (WIB / GMT+7)
 */
export function getWibTimeParts(dateInput = new Date()) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return { hours: 0, minutes: 0, dateStr: "", formattedTime: "--:--" };

  // Format jam:menit dalam timezone Asia/Jakarta
  const timeFormatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const dateFormatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const formattedTime = timeFormatter.format(d);
  const dateStr = dateFormatter.format(d).split("/").reverse().join("-"); // YYYY-MM-DD
  const [hours, minutes] = formattedTime.split(".").map(Number);

  return {
    hours: isNaN(hours) ? d.getHours() : hours,
    minutes: isNaN(minutes) ? d.getMinutes() : minutes,
    dateStr,
    formattedTime: `${String(hours || 0).padStart(2, "0")}:${String(minutes || 0).padStart(2, "0")} WIB`,
  };
}

/**
 * Evaluasi apakah suatu waktu pelaporan memenuhi batas cut-off Pk 21:00 WIB
 * @param {string|Date} submittedAt Timestamp saat laporan 1 foto disubmit
 * @returns {object} { status: 'TEPAT_WAKTU'|'TERLAMBAT', label: string, isLate: boolean, formattedTime: string }
 */
export function evaluateReportSubmissionTime(submittedAt) {
  if (!submittedAt) {
    return {
      status: "BELUM_LAPOR",
      label: "Belum Ada Laporan",
      isLate: false,
      formattedTime: "-",
    };
  }

  const { hours, minutes, formattedTime } = getWibTimeParts(submittedAt);

  // Jika jam < 21 atau (jam == 21 dan menit == 0) -> TEPAT WAKTU
  const isOnTime = hours < CUTOFF_HOUR || (hours === CUTOFF_HOUR && minutes === CUTOFF_MINUTE);

  if (isOnTime) {
    return {
      status: "TEPAT_WAKTU",
      label: "Tepat Waktu (<= 21:00)",
      isLate: false,
      formattedTime,
      color: "emerald",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300",
    };
  }

  return {
    status: "TERLAMBAT",
    label: "Terlambat (> 21:00)",
    isLate: true,
    formattedTime,
    color: "amber",
    badgeClass: "bg-amber-50 text-amber-900 border-amber-300",
  };
}

/**
 * Hitung sisa waktu menuju batas Cut-Off Pk 21:00 WIB hari ini
 */
export function getRemainingTimeToCutoff(nowInput = new Date()) {
  const { hours, minutes } = getWibTimeParts(nowInput);

  const currentMinutesTotal = hours * 60 + minutes;
  const cutoffMinutesTotal = CUTOFF_HOUR * 60 + CUTOFF_MINUTE;

  const diffMinutes = cutoffMinutesTotal - currentMinutesTotal;

  if (diffMinutes <= 0) {
    const passedMinutes = Math.abs(diffMinutes);
    const passedHours = Math.floor(passedMinutes / 60);
    const passedMinsRem = passedMinutes % 60;
    return {
      isPassed: true,
      text: passedHours > 0
        ? `Melewati cut-off (${passedHours}j ${passedMinsRem}m lalu)`
        : `Melewati cut-off (${passedMinsRem} menit lalu)`,
      minutesRemaining: 0,
    };
  }

  const remHours = Math.floor(diffMinutes / 60);
  const remMins = diffMinutes % 60;

  return {
    isPassed: false,
    text: remHours > 0 ? `${remHours} jam ${remMins} menit lagi` : `${remMins} menit lagi`,
    minutesRemaining: diffMinutes,
  };
}

/**
 * Hitung akumulasi statistik kepatuhan Cut-Off Jam 9 Malam untuk 1 orang teknisi
 * @param {object} personil Objek teknisi perorangan
 * @param {Array} tasks Seluruh daftar pekerjaan di sistem
 * @param {Array} timData Daftar tim
 */
export function calculateTechnicianCutoffStats(personil, tasks = [], timData = []) {
  if (!personil) {
    return {
      totalDilaporkan: 0,
      totalTepatWaktu: 0,
      totalTerlambat: 0,
      onTimeRate: 100,
      statusHariIni: "SIAP",
      statusLabel: "Siap Bertugas",
    };
  }

  const panggilan = (personil.panggilan || "").toUpperCase().trim();
  const nama = (personil.nama || "").toUpperCase().trim();
  const persTim = (personil.timNama || "").toUpperCase().trim();

  // Filter tugas yang dikerjakan teknisi ini
  const personilTasks = (tasks || []).filter((task) => {
    if (!task) return false;

    // 1. Cek langsung teknisi_list
    if (Array.isArray(task.teknisi_list)) {
      if (
        task.teknisi_list.some(
          (t) =>
            t.toUpperCase() === panggilan ||
            t.toUpperCase() === nama ||
            panggilan.includes(t.toUpperCase())
        )
      ) {
        return true;
      }
    }

    // 2. Cek tim personil
    if (persTim && task.tim) {
      const taskTim = task.tim.toUpperCase().trim();
      if (taskTim === persTim) return true;
      const matchingTeam = timData.find(
        (t) => (t.nama || "").toUpperCase() === persTim
      );
      if (matchingTeam?.alias && taskTim.includes(matchingTeam.alias.toUpperCase())) {
        return true;
      }
    }

    // 3. Cek apakah nama panggilan ada di task.tim
    if (task.tim && (task.tim.toUpperCase().includes(panggilan) || (nama && task.tim.toUpperCase().includes(nama)))) {
      return true;
    }

    return false;
  });

  // Tugas yang sudah selesai dan memiliki laporan
  const completedTasks = personilTasks.filter(
    (t) => t.status === "SELESAI" || t.status === "MENUNGGU VALIDASI"
  );

  let totalTepatWaktu = 0;
  let totalTerlambat = 0;

  completedTasks.forEach((t) => {
    const reportTimestamp = t.waktu_lapor || t.waktu_selesai || t.evidence?.waktu_lapor || t.evidence?.waktu_selesai;
    if (reportTimestamp) {
      const evalRes = evaluateReportSubmissionTime(reportTimestamp);
      if (evalRes.status === "TEPAT_WAKTU") {
        totalTepatWaktu++;
      } else {
        totalTerlambat++;
      }
    } else {
      // Default tepat waktu jika tidak ada timestamp spesifik
      totalTepatWaktu++;
    }
  });

  const totalDilaporkan = completedTasks.length;
  const onTimeRate = totalDilaporkan > 0
    ? Math.round((totalTepatWaktu / totalDilaporkan) * 100)
    : 100;

  // Evaluasi status hari ini
  const now = new Date();
  const todayYmd = now.toISOString().split("T")[0];
  const { hours } = getWibTimeParts(now);
  const isPastCutoff = hours >= CUTOFF_HOUR;

  const todayTasks = personilTasks.filter((t) => (t.tanggal || "").startsWith(todayYmd));
  const todayActiveTasks = todayTasks.filter(
    (t) => t.status === "WAITING LIST" || t.status === "DIJADWALKAN"
  );
  const todayCompletedTasks = todayTasks.filter(
    (t) => t.status === "SELESAI" || t.status === "MENUNGGU VALIDASI"
  );

  let statusHariIni = "SIAP";
  let statusLabel = "Siap Bertugas";
  let statusColor = "slate";

  if (todayCompletedTasks.length > 0) {
    const hasLate = todayCompletedTasks.some((t) => {
      const ts = t.waktu_lapor || t.waktu_selesai;
      return ts ? evaluateReportSubmissionTime(ts).isLate : false;
    });

    if (hasLate) {
      statusHariIni = "TERLAMBAT";
      statusLabel = "Lapor Terlambat (> 21:00)";
      statusColor = "amber";
    } else {
      statusHariIni = "TEPAT_WAKTU";
      statusLabel = "Lapor Tepat Waktu (<= 21:00)";
      statusColor = "emerald";
    }
  } else if (todayActiveTasks.length > 0) {
    if (isPastCutoff) {
      statusHariIni = "BELUM_LAPOR";
      statusLabel = "Belum Lapor (Lewat 21:00)";
      statusColor = "rose";
    } else {
      statusHariIni = "SEDANG_BERTUGAS";
      statusLabel = "Sedang Bertugas";
      statusColor = "blue";
    }
  }

  return {
    totalDilaporkan,
    totalTepatWaktu,
    totalTerlambat,
    onTimeRate,
    statusHariIni,
    statusLabel,
    statusColor,
  };
}
