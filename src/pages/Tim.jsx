import { useState } from "react";
import {
  Users,
  User,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Award,
  Coins,
  Wallet,
  Wrench,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Tag,
  Briefcase,
  Layers,
  Clock,
  AlertTriangle,
  MessageCircle,
} from "lucide-react";
import {
  initialTimData,
  initialPersonilList,
  pekerjaanList,
} from "../data/mockData";
import { usePersistState } from "../hooks/usePersistState";
import {
  calculateTaskIncentive,
  formatRupiah,
  MASTER_KOMISI_ITEMS,
} from "../lib/incentives";
import {
  calculateTechnicianCutoffStats,
  getRemainingTimeToCutoff,
  getWibTimeParts,
} from "../lib/reportCutoff";
import { createCutoffRecapWaMessage } from "../lib/whatsapp";
import Toast from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";
import PayrollManagementTab from "../components/PayrollManagementTab";

// Helper: Memeriksa apakah pekerjaan dikerjakan oleh tim
function matchTaskTeam(task, tim) {
  if (!task || !tim) return false;
  const taskTim = (task.tim || "").toUpperCase().trim();
  const timNama = (tim.nama || "").toUpperCase().trim();
  const timAlias = (tim.alias || "").toUpperCase().trim();

  if (taskTim === timNama) return true;
  if (timAlias && taskTim.includes(timAlias)) return true;
  if (timAlias && timAlias.includes(taskTim)) return true;

  // Jika di task ada teknisi_list, cocokkan dengan anggota tim
  if (Array.isArray(task.teknisi_list) && Array.isArray(tim.anggota)) {
    const hasMemberMatch = task.teknisi_list.some((tek) =>
      tim.anggota.some((m) => m.toUpperCase() === tek.toUpperCase())
    );
    if (hasMemberMatch) return true;
  }
  return false;
}

// Helper: Memeriksa apakah pekerjaan dikerjakan oleh teknisi perorangan
function matchTaskPersonil(task, personil, timData = []) {
  if (!task || !personil) return false;
  const panggilan = (personil.panggilan || "").toUpperCase().trim();
  const nama = (personil.nama || "").toUpperCase().trim();

  // 1. Cek langsung teknisi_list di SPK
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

  // 2. Cek apakah tim di task cocok dengan tim personil
  if (personil.timNama && task.tim) {
    const taskTim = task.tim.toUpperCase().trim();
    const persTim = personil.timNama.toUpperCase().trim();
    if (taskTim === persTim) return true;

    // Cek alias tim
    const matchingTeam = timData.find(
      (t) => (t.nama || "").toUpperCase() === persTim
    );
    if (matchingTeam?.alias && taskTim.includes(matchingTeam.alias.toUpperCase())) {
      return true;
    }
  }

  // 3. Cek apakah nama panggilan teknisi ada di string task.tim
  if (task.tim && (task.tim.toUpperCase().includes(panggilan) || (nama && task.tim.toUpperCase().includes(nama)))) {
    return true;
  }

  return false;
}

function TeamCard({ tim, pekerjaanData, masterKomisi, onEdit, onDelete }) {
  const timPekerjaan = pekerjaanData.filter((p) => matchTaskTeam(p, tim));
  const pemasanganSelesai = timPekerjaan.filter(
    (p) => p.jenis === "PEMASANGAN" && p.status === "SELESAI"
  ).length;
  const perbaikanSelesai = timPekerjaan.filter(
    (p) => p.jenis === "PERBAIKAN" && p.status === "SELESAI"
  ).length;
  const perbaikanKhususSelesai = timPekerjaan.filter(
    (p) => p.jenis === "PERBAIKAN KHUSUS (ODP/ODC)" && p.status === "SELESAI"
  ).length;
  const relokasiSelesai = timPekerjaan.filter(
    (p) => p.jenis === "RELOKASI" && p.status === "SELESAI"
  ).length;
  const pemutusanSelesai = timPekerjaan.filter(
    (p) => p.jenis === "PEMUTUSAN" && p.status === "SELESAI"
  ).length;
  const totalPekerjaan =
    pemasanganSelesai + perbaikanSelesai + perbaikanKhususSelesai + relokasiSelesai + pemutusanSelesai;
  const totalMenungguValidasi = timPekerjaan.filter(
    (p) => p.status === "MENUNGGU VALIDASI"
  ).length;
  const totalWaiting = timPekerjaan.filter(
    (p) => p.status === "WAITING LIST" || p.status === "DIJADWALKAN" || p.status === "MENUNGGU VALIDASI"
  ).length;
  const completionRate =
    totalPekerjaan + totalWaiting > 0
      ? ((totalPekerjaan / (totalPekerjaan + totalWaiting)) * 100).toFixed(0)
      : 0;

  // Komisi tugas perorangan utuh
  const totalKomisiPerPerson = timPekerjaan
    .filter((p) => p.status === "SELESAI")
    .reduce(
      (sum, p) =>
        sum +
        (p.komisi_total !== undefined
          ? Number(p.komisi_total)
          : calculateTaskIncentive(p, undefined, masterKomisi).total),
      0
    );

  const colors = [
    { bg: "bg-[#0D1B4A]", accent: "#F59E0B" },
    { bg: "bg-[#1e293b]", accent: "#38bdf8" },
    { bg: "bg-emerald-800", accent: "#F59E0B" },
  ];
  const colorSet = colors[tim.id % colors.length];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300 group flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className={`${colorSet.bg} px-4 sm:px-5 py-3.5 sm:py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-white text-sm sm:text-base truncate">
                    {tim.nama}
                  </h3>
                  <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-full">
                    {tim.status || "AKTIF"}
                  </span>
                </div>
                <p className="text-[11px] text-white/70 truncate">
                  {tim.area || "Area Pontianak"}
                </p>
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => onEdit(tim)}
                className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all active:scale-95 cursor-pointer"
                title="Edit Tim & Anggota"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(tim.id)}
                className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 text-white/90 hover:text-red-300 transition-all active:scale-95 cursor-pointer"
                title="Hapus Tim"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Anggota Teknisi Chips */}
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-white/60 font-medium">Anggota Regu:</span>
            {Array.isArray(tim.anggota) && tim.anggota.length > 0 ? (
              tim.anggota.map((ang) => (
                <span
                  key={ang}
                  className="px-2 py-0.5 bg-amber-400 text-slate-900 rounded-lg text-xs font-extrabold shadow-2xs"
                >
                  👷 {ang}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-white/40 italic">Belum ada anggota</span>
            )}
          </div>
        </div>

        {/* Stats 5 Kolom */}
        <div className="p-3.5 sm:p-5">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2 mb-3 sm:mb-4">
            <div className="text-center p-2 bg-blue-50 rounded-xl">
              <p className="text-base sm:text-lg font-black text-[#0D1B4A]">
                {pemasanganSelesai}
              </p>
              <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5 truncate">
                Pasang
              </p>
            </div>
            <div className="text-center p-2 bg-amber-50 rounded-xl">
              <p className="text-base sm:text-lg font-black text-[#F59E0B]">
                {perbaikanSelesai}
              </p>
              <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5 truncate">
                Perbaikan
              </p>
            </div>
            <div className="text-center p-2 bg-purple-50 rounded-xl">
              <p className="text-base sm:text-lg font-black text-purple-700">
                {perbaikanKhususSelesai}
              </p>
              <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5 truncate">
                ODP/ODC
              </p>
            </div>
            <div className="text-center p-2 bg-cyan-50 rounded-xl">
              <p className="text-base sm:text-lg font-black text-cyan-700">
                {relokasiSelesai}
              </p>
              <p className="text-[9px] font-semibold text-cyan-700 uppercase tracking-wider mt-0.5 truncate">
                Relokasi
              </p>
            </div>
            <div className="text-center p-2 bg-red-50 rounded-xl">
              <p className="text-base sm:text-lg font-black text-red-500">
                {pemutusanSelesai}
              </p>
              <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider mt-0.5 truncate">
                Putus
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-3">
            <div className="flex justify-between text-xs sm:text-sm mb-1.5">
              <span className="text-gray-500 font-medium">Completion Rate</span>
              <span className="font-bold text-gray-800">{completionRate}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-[#F59E0B] rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            {totalMenungguValidasi > 0 && (
              <div className="mt-2 flex items-center justify-between text-[11px] bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg border border-purple-200">
                <span className="font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-purple-600" />
                  <span>Menunggu Validasi SPV:</span>
                </span>
                <span className="font-black font-mono">{totalMenungguValidasi} SPK</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-xs sm:text-sm text-gray-500 font-medium">
              Total Tugas Tim Selesai
            </span>
            <span className="text-base sm:text-lg font-black text-gray-900">
              {totalPekerjaan} SPK
            </span>
          </div>
        </div>
      </div>

      {/* Commission Footer */}
      <div className="px-4 py-3 bg-slate-50 border-t border-gray-100 flex items-center justify-between text-xs">
        <div>
          <span className="text-[10px] text-gray-500 font-semibold block uppercase">
            Hak Komisi Per Orang
          </span>
          <span className="font-extrabold text-amber-700 font-mono text-sm">
            {formatRupiah(totalKomisiPerPerson)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[9px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
            Utuh per Anggota
          </span>
        </div>
      </div>
    </div>
  );
}

function PersonilCard({ personil, pekerjaanData, masterKomisi, timData, onEdit, onDelete }) {
  const personilPekerjaan = pekerjaanData.filter((p) =>
    matchTaskPersonil(p, personil, timData)
  );

  const pemasanganSelesai = personilPekerjaan.filter(
    (p) => p.jenis === "PEMASANGAN" && p.status === "SELESAI"
  ).length;
  const perbaikanSelesai = personilPekerjaan.filter(
    (p) => p.jenis === "PERBAIKAN" && p.status === "SELESAI"
  ).length;
  const perbaikanKhususSelesai = personilPekerjaan.filter(
    (p) => p.jenis === "PERBAIKAN KHUSUS (ODP/ODC)" && p.status === "SELESAI"
  ).length;
  const relokasiSelesai = personilPekerjaan.filter(
    (p) => p.jenis === "RELOKASI" && p.status === "SELESAI"
  ).length;
  const pemutusanSelesai = personilPekerjaan.filter(
    (p) => p.jenis === "PEMUTUSAN" && p.status === "SELESAI"
  ).length;

  const totalSelesai =
    pemasanganSelesai + perbaikanSelesai + perbaikanKhususSelesai + relokasiSelesai + pemutusanSelesai;

  // Evaluasi Kepatuhan Pelaporan Harian Maksimal Jam 9 Malam (Cut-Off 21:00 WIB)
  const cutoffStats = calculateTechnicianCutoffStats(personil, pekerjaanData, timData);

  // Komisi personal utuh per 1 orang
  const totalKomisiPersonal = personilPekerjaan
    .filter((p) => p.status === "SELESAI")
    .reduce(
      (sum, p) =>
        sum +
        (p.komisi_total !== undefined
          ? Number(p.komisi_total)
          : calculateTaskIncentive(p, undefined, masterKomisi).total),
      0
    );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:shadow-gray-200/50 transition-all duration-300 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0D1B4A] to-blue-800 text-amber-400 font-black flex items-center justify-center text-sm shadow-xs shrink-0">
              {personil.panggilan ? personil.panggilan.slice(0, 3).toUpperCase() : "TEK"}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-extrabold text-gray-900 text-sm sm:text-base leading-tight">
                  {personil.nama}
                </h4>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                  {personil.panggilan}
                </span>

                {/* Status Lapor Hari Ini (Cut-Off 21:00 WIB) */}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                    cutoffStats.statusHariIni === "TEPAT_WAKTU"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : cutoffStats.statusHariIni === "TERLAMBAT"
                      ? "bg-amber-50 text-amber-900 border-amber-300"
                      : cutoffStats.statusHariIni === "BELUM_LAPOR"
                      ? "bg-rose-50 text-rose-800 border-rose-300"
                      : cutoffStats.statusHariIni === "SEDANG_BERTUGAS"
                      ? "bg-blue-50 text-blue-800 border-blue-300"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      cutoffStats.statusHariIni === "TEPAT_WAKTU"
                        ? "bg-emerald-500"
                        : cutoffStats.statusHariIni === "TERLAMBAT"
                        ? "bg-amber-500"
                        : cutoffStats.statusHariIni === "BELUM_LAPOR"
                        ? "bg-rose-500"
                        : cutoffStats.statusHariIni === "SEDANG_BERTUGAS"
                        ? "bg-blue-500 animate-pulse"
                        : "bg-slate-400"
                    }`}
                  />
                  {cutoffStats.statusLabel}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{personil.peran || "Field Technician"}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 inline-flex items-center gap-1">
                  <Users className="w-3 h-3 text-amber-600" />
                  <span>{personil.timNama || "Solo / Bebas"}</span>
                </span>
                {personil.telepon && (
                  <span className="text-[11px] text-gray-400 flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3" />
                    <span>{personil.telepon}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => onEdit(personil)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
              title="Edit Teknisi"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(personil.id)}
              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
              title="Hapus Teknisi"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Performa Rincian */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="grid grid-cols-5 gap-1 text-center">
            <div className="p-1.5 sm:p-2 bg-blue-50/70 rounded-xl">
              <span className="text-sm sm:text-base font-black text-blue-900 block">{pemasanganSelesai}</span>
              <span className="text-[8px] font-bold text-blue-600 uppercase">Pasang</span>
            </div>
            <div className="p-1.5 sm:p-2 bg-amber-50/70 rounded-xl">
              <span className="text-sm sm:text-base font-black text-amber-900 block">{perbaikanSelesai}</span>
              <span className="text-[8px] font-bold text-amber-600 uppercase">Perbaikan</span>
            </div>
            <div className="p-1.5 sm:p-2 bg-purple-50/70 rounded-xl">
              <span className="text-sm sm:text-base font-black text-purple-900 block">{perbaikanKhususSelesai}</span>
              <span className="text-[8px] font-bold text-purple-600 uppercase">ODP/ODC</span>
            </div>
            <div className="p-1.5 sm:p-2 bg-cyan-50/70 rounded-xl">
              <span className="text-sm sm:text-base font-black text-cyan-900 block">{relokasiSelesai}</span>
              <span className="text-[8px] font-bold text-cyan-600 uppercase">Relokasi</span>
            </div>
            <div className="p-1.5 sm:p-2 bg-rose-50/70 rounded-xl">
              <span className="text-sm sm:text-base font-black text-rose-900 block">{pemutusanSelesai}</span>
              <span className="text-[8px] font-bold text-rose-600 uppercase">Putus</span>
            </div>
          </div>

          {/* Kepatuhan Cut-Off Jam 9 Malam (21:00 WIB) */}
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-slate-600 font-semibold flex items-center gap-1.5 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Kepatuhan Laporan (Maks Pk 21:00)</span>
              </span>
              <span
                className={`font-black text-xs ${
                  cutoffStats.onTimeRate >= 80 ? "text-emerald-700" : "text-amber-700"
                }`}
              >
                {cutoffStats.onTimeRate}% Tepat Waktu
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  cutoffStats.onTimeRate >= 80 ? "bg-emerald-500" : "bg-amber-500"
                }`}
                style={{ width: `${cutoffStats.onTimeRate}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
              <span>Tepat waktu: {cutoffStats.totalTepatWaktu} SPK</span>
              <span>Terlambat: {cutoffStats.totalTerlambat} SPK</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
            <span className="text-gray-500 font-medium">Total Pekerjaan Diselesaikan:</span>
            <span className="font-extrabold text-gray-900 text-sm">{totalSelesai} Tugas</span>
          </div>
        </div>
      </div>

      {/* Saldo Komisi Personal Utuh */}
      <div className="px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-t border-amber-200/80 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-amber-600" />
            <span>Akumulasi Komisi Personal</span>
          </span>
          <p className="text-base font-black text-amber-800 font-mono">
            {formatRupiah(totalKomisiPersonal)}
          </p>
        </div>
        <span className="text-[9px] font-extrabold px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-md">
          Hak Utuh 100%
        </span>
      </div>
    </div>
  );
}

export default function Tim() {
  const [timData, setTimData] = usePersistState("xnet_tim", initialTimData);
  const [personilData, setPersonilData] = usePersistState(
    "xnet_personil",
    initialPersonilList
  );
  const [pekerjaanData] = usePersistState("xnet_pekerjaan", pekerjaanList);
  const [masterKomisi] = usePersistState("xnet_master_komisi", MASTER_KOMISI_ITEMS);

  const [activeTab, setActiveTab] = useState("TIM"); // "TIM" | "PERSONAL" | "PAYROLL"
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showPersonilModal, setShowPersonilModal] = useState(false);

  const [editingTim, setEditingTim] = useState(null);
  const [teamForm, setTeamForm] = useState({
    nama: "",
    area: "",
    telepon: "",
    anggota: [],
  });

  const [editingPersonil, setEditingPersonil] = useState(null);
  const [personilForm, setPersonilForm] = useState({
    nama: "",
    panggilan: "",
    telepon: "",
    peran: "Installer / Field Tech",
    timNama: "Tim A",
  });

  const [toast, setToast] = useState(null);
  const [deleteTargetTim, setDeleteTargetTim] = useState(null);
  const [deleteTargetPersonil, setDeleteTargetPersonil] = useState(null);

  // Perhitungan KPI Keseluruhan
  const totalSelesaiSemua = pekerjaanData.filter((p) => p.status === "SELESAI").length;
  const totalKomisiGlobal = pekerjaanData
    .filter((p) => p.status === "SELESAI")
    .reduce(
      (sum, p) =>
        sum +
        (p.komisi_total !== undefined
          ? Number(p.komisi_total)
          : calculateTaskIncentive(p, undefined, masterKomisi).total),
      0
    );

  const remainingCutoff = getRemainingTimeToCutoff();
  const currentWib = getWibTimeParts();

  const handleSendCutoffWaRecap = () => {
    const waText = createCutoffRecapWaMessage(personilData, pekerjaanData);
    const encoded = encodeURIComponent(waText);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  // === HANDLER REGULASI TIM ===
  const handleAddTim = () => {
    setEditingTim(null);
    setTeamForm({
      nama: "",
      area: "Pontianak Kota / Siantan",
      telepon: "",
      anggota: [],
    });
    setShowTeamModal(true);
  };

  const handleEditTim = (tim) => {
    setEditingTim(tim);
    setTeamForm({
      nama: tim.nama || "",
      area: tim.area || "",
      telepon: tim.telepon || "",
      anggota: Array.isArray(tim.anggota) ? [...tim.anggota] : [],
    });
    setShowTeamModal(true);
  };

  const handleSaveTim = (e) => {
    e.preventDefault();
    const cleanNama = teamForm.nama.trim();
    if (!cleanNama) {
      setToast({ type: "error", message: "Nama tim tidak boleh kosong." });
      return;
    }

    if (editingTim) {
      setTimData(
        timData.map((t) =>
          t.id === editingTim.id
            ? {
                ...t,
                nama: cleanNama,
                area: teamForm.area,
                telepon: teamForm.telepon,
                anggota: teamForm.anggota,
              }
            : t
        )
      );

      // Sinkronkan timNama di personilData
      setPersonilData(
        personilData.map((p) => {
          if (teamForm.anggota.includes(p.panggilan)) {
            return { ...p, timNama: cleanNama };
          }
          if (p.timNama === editingTim.nama && !teamForm.anggota.includes(p.panggilan)) {
            return { ...p, timNama: "" };
          }
          return p;
        })
      );

      setToast({ type: "success", message: `Tim "${cleanNama}" berhasil diperbarui.` });
    } else {
      const newTim = {
        id: Date.now(),
        nama: cleanNama,
        area: teamForm.area,
        telepon: teamForm.telepon,
        anggota: teamForm.anggota,
        status: "AKTIF",
      };
      setTimData([...timData, newTim]);

      // Sinkronkan personil yang dipilih ke tim baru
      setPersonilData(
        personilData.map((p) =>
          teamForm.anggota.includes(p.panggilan) ? { ...p, timNama: cleanNama } : p
        )
      );

      setToast({ type: "success", message: `Tim "${cleanNama}" berhasil ditambahkan.` });
    }
    setShowTeamModal(false);
  };

  const confirmDeleteTim = () => {
    if (!deleteTargetTim) return;
    setTimData(timData.filter((t) => t.id !== deleteTargetTim.id));
    setToast({
      type: "success",
      message: `Tim "${deleteTargetTim.nama}" berhasil dihapus.`,
    });
    setDeleteTargetTim(null);
  };

  // === HANDLER PERSONIL TEKNISI ===
  const handleAddPersonil = () => {
    setEditingPersonil(null);
    setPersonilForm({
      nama: "",
      panggilan: "",
      telepon: "",
      peran: "Installer / Field Tech",
      timNama: timData[0]?.nama || "Tim A",
    });
    setShowPersonilModal(true);
  };

  const handleEditPersonil = (personil) => {
    setEditingPersonil(personil);
    setPersonilForm({
      nama: personil.nama || "",
      panggilan: personil.panggilan || "",
      telepon: personil.telepon || "",
      peran: personil.peran || "Installer / Field Tech",
      timNama: personil.timNama || "",
    });
    setShowPersonilModal(true);
  };

  const handleSavePersonil = (e) => {
    e.preventDefault();
    const cleanNama = personilForm.nama.trim();
    const cleanPanggilan = personilForm.panggilan.trim() || cleanNama.split(" ")[0];
    if (!cleanNama) {
      setToast({ type: "error", message: "Nama teknisi tidak boleh kosong." });
      return;
    }

    if (editingPersonil) {
      setPersonilData(
        personilData.map((p) =>
          p.id === editingPersonil.id
            ? {
                ...p,
                nama: cleanNama,
                panggilan: cleanPanggilan,
                telepon: personilForm.telepon,
                peran: personilForm.peran,
                timNama: personilForm.timNama,
              }
            : p
        )
      );

      // Sinkronkan ke timList jika personil ditambahkan ke tim
      if (personilForm.timNama) {
        setTimData(
          timData.map((t) => {
            if (t.nama === personilForm.timNama) {
              const currentAnggota = Array.isArray(t.anggota) ? t.anggota : [];
              if (!currentAnggota.includes(cleanPanggilan)) {
                return { ...t, anggota: [...currentAnggota, cleanPanggilan] };
              }
            } else if (Array.isArray(t.anggota) && t.anggota.includes(editingPersonil.panggilan)) {
              return { ...t, anggota: t.anggota.filter((a) => a !== editingPersonil.panggilan) };
            }
            return t;
          })
        );
      }

      setToast({ type: "success", message: `Data teknisi "${cleanNama}" berhasil diperbarui.` });
    } else {
      const newPersonil = {
        id: Date.now(),
        nama: cleanNama,
        panggilan: cleanPanggilan,
        telepon: personilForm.telepon,
        peran: personilForm.peran,
        timNama: personilForm.timNama,
        status: "AKTIF",
      };
      setPersonilData([...personilData, newPersonil]);

      // Tambahkan ke tim yang dipilih jika ada
      if (personilForm.timNama) {
        setTimData(
          timData.map((t) => {
            if (t.nama === personilForm.timNama) {
              const currentAnggota = Array.isArray(t.anggota) ? t.anggota : [];
              return { ...t, anggota: [...currentAnggota, cleanPanggilan] };
            }
            return t;
          })
        );
      }

      setToast({ type: "success", message: `Teknisi "${cleanNama}" berhasil ditambahkan.` });
    }
    setShowPersonilModal(false);
  };

  const confirmDeletePersonil = () => {
    if (!deleteTargetPersonil) return;
    setPersonilData(personilData.filter((p) => p.id !== deleteTargetPersonil.id));

    // Bersihkan dari daftar anggota tim
    setTimData(
      timData.map((t) => ({
        ...t,
        anggota: Array.isArray(t.anggota)
          ? t.anggota.filter((a) => a !== deleteTargetPersonil.panggilan)
          : [],
      }))
    );

    setToast({
      type: "success",
      message: `Teknisi "${deleteTargetPersonil.nama}" berhasil dihapus.`,
    });
    setDeleteTargetPersonil(null);
  };

  return (
    <div className="space-y-5">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Manajemen Tim & Teknisi Personal
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Kelola regu kerja, performa teknisi perorangan, dan validasi komisi personal
          </p>
        </div>

        <div className="flex gap-2">
          {activeTab === "TIM" && (
            <button
              onClick={handleAddTim}
              className="flex items-center justify-center gap-2 bg-[#0D1B4A] hover:bg-[#1a237e] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Tim</span>
            </button>
          )}

          {activeTab === "PERSONAL" && (
            <button
              onClick={handleAddPersonil}
              className="flex items-center justify-center gap-2 bg-[#0D1B4A] hover:bg-[#1a237e] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Teknisi</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tabs Navigasi */}
      <div className="flex border-b border-gray-200 gap-4 sm:gap-6 overflow-x-auto no-scrollbar whitespace-nowrap">
        <button
          onClick={() => setActiveTab("TIM")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "TIM"
              ? "border-[#0D1B4A] text-[#0D1B4A]"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Performa Per Tim ({timData.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("PERSONAL")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "PERSONAL"
              ? "border-[#0D1B4A] text-[#0D1B4A]"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          <User className="w-4 h-4" />
          <span>Performa Perorangan ({personilData.length} Teknisi)</span>
        </button>

        <button
          onClick={() => setActiveTab("PAYROLL")}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "PAYROLL"
              ? "border-[#F59E0B] text-[#F59E0B]"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Penggajian & Slip Komisi</span>
        </button>
      </div>

      {/* Konten Tab Aktif */}
      {activeTab === "PAYROLL" ? (
        <PayrollManagementTab
          timList={timData}
          pekerjaanData={pekerjaanData}
          masterKomisi={masterKomisi}
        />
      ) : activeTab === "PERSONAL" ? (
        <>
          {/* Banner Batas Cut-Off Jam 9 Malam (Pk 21:00 WIB) */}
          <div className="bg-gradient-to-r from-[#0D1B4A] via-slate-900 to-blue-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-800">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 font-bold shadow-md">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-sm sm:text-base text-white">
                      Batas Laporan Pekerjaan: Maksimal Jam 9 Malam (21:00 WIB)
                    </h3>
                    <span className="text-[10px] font-extrabold bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full">
                      Cut-Off Harian
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Setiap teknisi wajib melaporkan minimal 1 foto bukti fisik sebelum jam 21:00 WIB. Laporan tepat waktu otomatis masuk perhitungan validasi harian dan penilaian kinerja personal.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-stretch md:self-auto justify-between md:justify-end bg-white/10 p-2 sm:p-2.5 rounded-xl border border-white/10 text-xs shrink-0 flex-wrap">
                <div>
                  <span className="text-[10px] text-slate-300 block font-medium">Batas Waktu Hari Ini:</span>
                  <span className="font-bold text-amber-300 font-mono text-sm">
                    {remainingCutoff.text}
                  </span>
                </div>
                <div className="text-right border-l border-white/20 pl-2.5 pr-1">
                  <span className="text-[10px] text-slate-400 block font-medium">Waktu Server</span>
                  <span className="text-xs font-bold text-white font-mono">
                    {currentWib.formattedTime}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSendCutoffWaRecap}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                  title="Kirim Ringkasan Laporan Cut-Off Pk 21:00 ke WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Kirim Rekap WA</span>
                </button>
              </div>
            </div>
          </div>

          {/* KPI Ringkasan Teknisi Perorangan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0D1B4A] flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Total Teknisi Personal
                </p>
                <p className="text-xl font-black text-gray-900">{personilData.length} Orang</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tugas Selesai Terverifikasi
                </p>
                <p className="text-xl font-black text-gray-900">{totalSelesaiSemua} SPK</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-200/80 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#0D1B4A] flex items-center justify-center shrink-0 shadow-xs font-bold">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Ketentuan Hak Komisi
                </p>
                <p className="text-sm font-extrabold text-amber-900">
                  Komisi Utuh 100% Per Orang
                </p>
              </div>
            </div>
          </div>

          {/* Grid Personil Teknisi */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {personilData.map((personil) => (
              <PersonilCard
                key={personil.id}
                personil={personil}
                pekerjaanData={pekerjaanData}
                masterKomisi={masterKomisi}
                timData={timData}
                onEdit={handleEditPersonil}
                onDelete={() => setDeleteTargetPersonil(personil)}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* KPI Ringkasan Tim */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0D1B4A] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Total Regu Tim
                </p>
                <p className="text-xl font-black text-gray-900">{timData.length} Tim</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Total Pekerjaan Selesai
                </p>
                <p className="text-xl font-black text-gray-900">{totalSelesaiSemua} Tugas</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-orange-50/60 p-4 rounded-2xl border border-amber-200/80 shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#0D1B4A] flex items-center justify-center shrink-0 shadow-xs font-bold">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Estimasi Komisi Pekerjaan
                </p>
                <p className="text-xl font-black text-amber-700 font-mono">
                  {formatRupiah(totalKomisiGlobal)}
                </p>
              </div>
            </div>
          </div>

          {/* Grid Tim */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {timData.map((tim) => (
              <TeamCard
                key={tim.id}
                tim={tim}
                pekerjaanData={pekerjaanData}
                masterKomisi={masterKomisi}
                onEdit={handleEditTim}
                onDelete={() => setDeleteTargetTim(tim)}
              />
            ))}
          </div>
        </>
      )}

      {/* Modal Tambah/Edit Tim (Termasuk Pemilihan Anggota Teknisi) */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 sm:hidden" />
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {editingTim ? "Edit Tim & Anggota" : "Tambah Tim Baru"}
              </h3>
              <button
                type="button"
                onClick={() => setShowTeamModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveTim} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Nama Tim
                </label>
                <input
                  type="text"
                  required
                  value={teamForm.nama}
                  onChange={(e) => setTeamForm({ ...teamForm, nama: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                  placeholder="Contoh: Tim A, Tim B, Tim C"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Wilayah / Area Operasional
                </label>
                <input
                  type="text"
                  value={teamForm.area}
                  onChange={(e) => setTeamForm({ ...teamForm, area: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                  placeholder="Contoh: Pontianak Kota / Siantan"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Nomor Kontak WhatsApp Tim
                </label>
                <input
                  type="text"
                  value={teamForm.telepon}
                  onChange={(e) => setTeamForm({ ...teamForm, telepon: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                  placeholder="Contoh: 081234567890"
                />
              </div>

              {/* Pemilihan Anggota Teknisi (Multi-select Checklist) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Pilih Anggota Teknisi Regu
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  {personilData.map((p) => {
                    const isChecked = teamForm.anggota.includes(p.panggilan);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          isChecked ? "bg-amber-100/70 border border-amber-300" : "hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTeamForm({
                                  ...teamForm,
                                  anggota: [...teamForm.anggota, p.panggilan],
                                });
                              } else {
                                setTeamForm({
                                  ...teamForm,
                                  anggota: teamForm.anggota.filter((a) => a !== p.panggilan),
                                });
                              }
                            }}
                            className="rounded text-amber-500 focus:ring-amber-400"
                          />
                          <span className="text-xs font-bold text-slate-800">{p.nama}</span>
                          <span className="text-[10px] text-slate-500 font-medium">({p.panggilan})</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{p.peran}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowTeamModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-sm font-semibold bg-[#0D1B4A] hover:bg-slate-900 text-white rounded-xl hover:shadow-md transition-all cursor-pointer"
                >
                  Simpan Tim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah/Edit Teknisi Personal */}
      {showPersonilModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 sm:hidden" />
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {editingPersonil ? "Edit Data Teknisi" : "Tambah Teknisi Personal"}
              </h3>
              <button
                type="button"
                onClick={() => setShowPersonilModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSavePersonil} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={personilForm.nama}
                  onChange={(e) => setPersonilForm({ ...personilForm, nama: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                  placeholder="Contoh: Ais Maulana, Gatra Wicaksono"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Nama Panggilan / Kode Singkat
                </label>
                <input
                  type="text"
                  required
                  value={personilForm.panggilan}
                  onChange={(e) => setPersonilForm({ ...personilForm, panggilan: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                  placeholder="Contoh: AIS, Gatra, Jusman, Iqbal"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Nomor WhatsApp
                </label>
                <input
                  type="text"
                  value={personilForm.telepon}
                  onChange={(e) => setPersonilForm({ ...personilForm, telepon: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                  placeholder="Contoh: 081234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Peran / Spesialisasi
                </label>
                <select
                  value={personilForm.peran}
                  onChange={(e) => setPersonilForm({ ...personilForm, peran: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                >
                  <option value="Installer / Field Tech">Installer / Field Tech</option>
                  <option value="Splicer / Fiber Specialist">Splicer / Fiber Specialist</option>
                  <option value="Team Leader / Field Tech">Team Leader / Field Tech</option>
                  <option value="Specialist ODP/ODC">Specialist ODP/ODC</option>
                  <option value="Maintenance & Troubleshooter">Maintenance & Troubleshooter</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Tim Naungan
                </label>
                <select
                  value={personilForm.timNama}
                  onChange={(e) => setPersonilForm({ ...personilForm, timNama: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0D1B4A] outline-none"
                >
                  <option value="">-- Tanpa Tim (Solo) --</option>
                  {timData.map((t) => (
                    <option key={t.id} value={t.nama}>
                      {t.nama} ({t.area || "Pontianak"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowPersonilModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 text-sm font-semibold bg-[#0D1B4A] hover:bg-slate-900 text-white rounded-xl hover:shadow-md transition-all cursor-pointer"
                >
                  Simpan Teknisi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Tim */}
      <ConfirmModal
        isOpen={!!deleteTargetTim}
        onClose={() => setDeleteTargetTim(null)}
        onConfirm={confirmDeleteTim}
        title="Hapus Tim Teknisi?"
        message={`Apakah Anda yakin ingin menghapus tim "${deleteTargetTim?.nama}"? Data riwayat penugasan akan tetap tersimpan.`}
        confirmText="Hapus Tim"
        variant="danger"
      />

      {/* Modal Konfirmasi Hapus Personil */}
      <ConfirmModal
        isOpen={!!deleteTargetPersonil}
        onClose={() => setDeleteTargetPersonil(null)}
        onConfirm={confirmDeletePersonil}
        title="Hapus Teknisi?"
        message={`Apakah Anda yakin ingin menghapus data teknisi "${deleteTargetPersonil?.nama}" (${deleteTargetPersonil?.panggilan})?`}
        confirmText="Hapus Teknisi"
        variant="danger"
      />
    </div>
  );
}
