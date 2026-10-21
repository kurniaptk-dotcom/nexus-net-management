import React, { useState } from "react";
import {
  X,
  Calendar,
  Clock,
  HardHat,
  RotateCcw,
  AlertTriangle,
  Send,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import { createWhatsAppUrl, getRescheduleCustomerWaTemplate } from "../lib/whatsapp";
import { showToast } from "../lib/toast";

export default function RescheduleModal({ task, isOpen, onClose, onConfirm, timList = [] }) {
  if (!isOpen || !task) return null;

  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const defaultDateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

  const [newDate, setNewDate] = useState(defaultDateStr);
  const [newSesi, setNewSesi] = useState("Sesi Pagi (08:30 - 12:00 WIB)");
  const [newTim, setNewTim] = useState(task.tim || (timList[0]?.nama || "GATRA - AIS"));
  const [csNote, setCsNote] = useState("Pelanggan telah dihubungi dan menyepakati jadwal kunjungan ulang.");
  const [sendWa, setSendWa] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newDate) {
      showToast("Tanggal jadwal ulang wajib dipilih!", "warning");
      return;
    }

    const updatedTask = {
      ...task,
      status: "DIJADWALKAN",
      tanggal: newDate,
      sesi: newSesi,
      tim: newTim,
      is_started: false,
      waktu_mulai: null,
      keterangan: `[Reschedule CS] ${csNote} · Sebelumnya terkendala: ${task.alasan_kendala || task.keterangan || "-"}`,
      timeline: [
        ...(Array.isArray(task.timeline) ? task.timeline : []),
        {
          timestamp: new Date().toISOString(),
          formattedTime: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          action: "Jadwal Ulang (Reschedule CS)",
          actor: "Customer Service",
          color: "purple",
          notes: `Dijadwalkan ulang ke ${newDate} (${newSesi}). Tim: ${newTim}. Catatan CS: "${csNote}".`,
        },
      ],
    };

    onConfirm(updatedTask);

    if (sendWa && task.telepon) {
      const waText =
        `Halo Bpk/Ibu *${task.pelanggan}*, terima kasih atas konfirmasinya 🙏\n\n` +
        `Kunjungan ulang teknisi Nexus Net untuk *${task.jenis}* telah kami jadwalkan:\n` +
        `📅 *Tanggal:* ${newDate}\n` +
        `⏰ *Sesi:* ${newSesi}\n` +
        `👷 *Tim Teknisi:* ${newTim}\n\n` +
        `Mohon pastikan ada anggota keluarga di rumah pada jam tersebut. Terima kasih!`;
      const url = createWhatsAppUrl(task.telepon, waText);
      if (url) window.open(url, "_blank");
    }

    showToast(`SPK "${task.pelanggan}" berhasil dijadwalkan ulang ke ${newDate}!`, "success");
    onClose();
  };

  const kendalaText = task.alasan_kendala || task.keterangan || "Pelanggan tidak ada di rumah / kendala fisik";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-900 via-indigo-900 to-[#0D1B4A] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Jadwalkan Ulang SPK (Reschedule)</h3>
              <p className="text-xs text-purple-200 mt-0.5">
                {task.pelanggan} · {task.spk_no || `#${task.id}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Kendala Sebelumnya */}
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Kendala Lapangan yang Dilaporkan:</span>
            </div>
            <p className="text-xs text-rose-950 pl-5 leading-relaxed font-semibold">
              "{kendalaText}"
            </p>
          </div>

          {/* Tanggal Baru */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span>Tanggal Kunjungan Baru</span>
            </label>
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-purple-600 outline-none"
            />
          </div>

          {/* Sesi & Tim */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>Pilih Sesi</span>
              </label>
              <select
                value={newSesi}
                onChange={(e) => setNewSesi(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-purple-600 outline-none"
              >
                <option value="Sesi Pagi (08:30 - 12:00 WIB)">Sesi Pagi (08:30 - 12:00)</option>
                <option value="Sesi Siang (13:00 - 16:00 WIB)">Sesi Siang (13:00 - 16:00)</option>
                <option value="Sesi Sore (16:00 - 20:00 WIB)">Sesi Sore (16:00 - 20:00)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <HardHat className="w-4 h-4 text-purple-600" />
                <span>Tim Teknisi</span>
              </label>
              <select
                value={newTim}
                onChange={(e) => setNewTim(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-purple-600 outline-none"
              >
                {timList.map((t) => (
                  <option key={t.id || t.nama} value={t.nama}>
                    {t.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Catatan Konfirmasi CS */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Hasil Komunikasi CS dengan Pelanggan
            </label>
            <textarea
              rows={2}
              value={csNote}
              onChange={(e) => setCsNote(e.target.value)}
              placeholder="Contoh: Pelanggan konfirmasi siap di rumah besok siang setelah jam 13:00."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-purple-600 outline-none"
            />
          </div>

          {/* Opsi Kirim WhatsApp Konfirmasi ke Pelanggan */}
          <label className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-2xl flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-purple-200/70 text-purple-800 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-purple-700" />
              </div>
              <div>
                <p className="text-xs font-bold text-purple-950">Kirim WhatsApp Konfirmasi Otomatis</p>
                <p className="text-[11px] text-purple-700">Kirim naskah jadwal baru ke nomor pelanggan ({task.telepon || "-"})</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={sendWa}
              onChange={(e) => setSendWa(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded"
            />
          </label>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan & Aktifkan Kembali</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
