import React from "react";
import {
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Activity,
  HardHat,
  Camera,
  Calendar,
  User,
  ArrowRight,
  ShieldCheck,
  FileText,
  RotateCcw,
} from "lucide-react";

/**
 * Modal Kronologis Riwayat Perjalanan SPK & Audit Trail
 * Menghubungkan titik alur Leads -> CS -> SPV -> Teknisi -> Validasi
 */
export default function TicketTimelineModal({ task, isOpen, onClose }) {
  if (!isOpen || !task) return null;

  // Synthesize events if timeline array is not yet present on legacy records
  const events = Array.isArray(task.timeline) && task.timeline.length > 0
    ? task.timeline
    : [
        {
          timestamp: task.created_at || task.tanggal || "Tercatat",
          action: "SPK Diterbitkan",
          actor: "CS / Dispatcher",
          icon: FileText,
          color: "blue",
          notes: `SPK ${task.spk_no || `#${task.id}`} dibuat untuk pekerjaan ${task.jenis}.`,
        },
        task.tim && {
          timestamp: task.tanggal ? `${task.tanggal} ${task.sesi || ""}` : "Dijadwalkan",
          action: "Penugasan Regu Teknisi",
          actor: "Supervisor (SPV)",
          icon: HardHat,
          color: "purple",
          notes: `Ditugaskan ke Tim ${task.tim}${Array.isArray(task.teknisi_list) && task.teknisi_list.length > 0 ? ` (${task.teknisi_list.join(", ")})` : ""}. Target: ${task.tanggal || "Hari Ini"}.`,
        },
        task.is_started && {
          timestamp: task.waktu_mulai ? new Date(task.waktu_mulai).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB" : "Proses",
          action: "Menuju Lokasi Pelanggan",
          actor: "Teknisi Lapangan",
          icon: Activity,
          color: "blue",
          notes: "Teknisi menekan tombol Mulai dan melakukan perjalanan ke lokasi instalasi.",
        },
        task.status === "GAGAL" && {
          timestamp: task.waktu_lapor ? new Date(task.waktu_lapor).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB" : "Tertunda",
          action: "Laporan Ada Kendala",
          actor: "Teknisi Lapangan",
          icon: AlertTriangle,
          color: "rose",
          notes: `Kendala: ${task.alasan_kendala || task.keterangan || "Kondisi fisik di lapangan"}.`,
        },
        task.revisi_catatan && {
          timestamp: "Revisi SPV",
          action: "Permintaan Revisi SOP",
          actor: "Supervisor (SPV)",
          icon: RotateCcw,
          color: "amber",
          notes: `Catatan revisi: ${task.revisi_catatan}`,
        },
        (task.foto_bukti_utama || task.foto_opm || task.status === "MENUNGGU VALIDASI" || task.status === "SELESAI") && {
          timestamp: task.waktu_lapor ? new Date(task.waktu_lapor).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB" : "Laporan Masuk",
          action: "Laporan 1 Foto Terlampir",
          actor: "Teknisi Lapangan",
          icon: Camera,
          color: "indigo",
          notes: `Foto fisik distempel GPS terlampir. Redaman ukur OPM: ${task.redaman || "-"} dBm (${task.cutoff_label || (task.cutoff_status === "TEPAT_WAKTU" ? "<= 21:00 WIB" : "> 21:00 WIB")}).`,
        },
        task.status === "SELESAI" && {
          timestamp: task.waktu_selesai ? new Date(task.waktu_selesai).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB" : "Selesai",
          action: "Validasi Selesai & Komisi Sah",
          actor: "Supervisor (SPV)",
          icon: CheckCircle2,
          color: "emerald",
          notes: "SOP dinyatakan lolos QC. Komisi teknisi diverifikasi utuh dan port ODP tersinkronisasi.",
        },
      ].filter(Boolean);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[88vh]"
      >
        {/* Header Modal */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-[#0D1B4A] to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black tracking-tight">Riwayat Perjalanan SPK</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/20 text-amber-300">
                  {task.spk_no || `#${task.id}`}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {task.pelanggan} · {task.jenis} · Tim {task.tim || "-"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Highlights */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500 uppercase text-[10px]">Status Saat Ini:</span>
            <span className="font-extrabold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-900 shadow-2xs">
              {task.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500 uppercase text-[10px]">ODP Tiang:</span>
            <span className="font-bold text-blue-700 font-mono">
              {task.odp || "-"} {task.port ? `(Port ${task.port})` : ""}
            </span>
          </div>
        </div>

        {/* Timeline Event List */}
        <div className="p-5 overflow-y-auto space-y-6">
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {events.map((ev, idx) => {
              const EventIcon = ev.icon || Clock;
              const isLast = idx === events.length - 1;

              const colorStyles = {
                blue: "bg-blue-500 text-white border-blue-200 ring-blue-100",
                purple: "bg-purple-600 text-white border-purple-200 ring-purple-100",
                emerald: "bg-emerald-600 text-white border-emerald-200 ring-emerald-100",
                rose: "bg-rose-500 text-white border-rose-200 ring-rose-100",
                amber: "bg-amber-500 text-white border-amber-200 ring-amber-100",
                indigo: "bg-indigo-600 text-white border-indigo-200 ring-indigo-100",
              }[ev.color || "blue"];

              return (
                <div key={idx} className="relative group">
                  {/* Dot Icon */}
                  <div
                    className={`absolute -left-[30px] top-0 w-6 h-6 rounded-full flex items-center justify-center ring-4 shadow-xs transition-transform group-hover:scale-110 ${colorStyles}`}
                  >
                    <EventIcon className="w-3 h-3" />
                  </div>

                  {/* Card Content */}
                  <div className={`p-3.5 rounded-2xl border transition-all ${isLast ? "bg-amber-50/40 border-amber-200 shadow-2xs" : "bg-white border-slate-200/80 hover:border-slate-300"}`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                        <span>{ev.action}</span>
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                        {ev.timestamp || ev.formattedTime || "-"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/70 inline-flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>Oleh: {ev.actor || "Sistem"}</span>
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {ev.notes || ev.detail || "-"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span>Total {events.length} jejak audit terekam</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition-all cursor-pointer active:scale-95 shadow-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
