import { useState, useMemo } from "react";
import {
  X,
  Gauge,
  Barcode,
  Network,
  Calendar,
  CheckCircle2,
  HardHat,
  Maximize2,
  Download,
  FileCheck,
  AlertTriangle,
  ZoomIn,
  Coins,
} from "lucide-react";
import { getDbmQuality, calculateTaskIncentive, formatRupiah, KOMISI_PEKERJAAN_MASTER } from "../lib/incentives";

function PhotoItem({ photo, title, emptyLabel, icon: Icon, onZoom }) {
  const isPruned = typeof photo === "string" && (photo.includes("[Tersimpan") || photo.includes("[Cloud Backup]") || photo.includes("[Arsip"));
  const isValidUrl = typeof photo === "string" && (photo.startsWith("http://") || photo.startsWith("https://") || photo.startsWith("data:image/") || photo.startsWith("blob:"));

  return (
    <div className="group relative bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 aspect-4/3 flex flex-col justify-end">
      {isValidUrl ? (
        <>
          <img
            src={photo}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
          <div className="relative p-2.5 flex items-center justify-between text-white z-10">
            <span className="text-[11px] font-bold">{title}</span>
            <button
              type="button"
              onClick={() => onZoom({ url: photo, title })}
              className="p-1 bg-white/20 hover:bg-white/40 rounded-lg text-white backdrop-blur-xs transition-colors cursor-pointer"
              title="Perbesar Foto"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      ) : isPruned ? (
        <div className="absolute inset-0 p-3 bg-gradient-to-br from-slate-50 to-blue-50/50 flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center mb-1.5 shadow-2xs">
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-slate-800">{title}</span>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5">Tersimpan di Cloud Backup</span>
          <span className="inline-block mt-1.5 px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-[9px] font-bold rounded-md">
            Diarsipkan (Hemat Kuota)
          </span>
        </div>
      ) : (
        <div className="p-4 text-center my-auto text-slate-400">
          <Icon className="w-6 h-6 mx-auto mb-1 opacity-50" />
          <span className="text-[11px] font-medium block">{emptyLabel}</span>
        </div>
      )}
    </div>
  );
}

export default function BuktiLapanganModal({ task, onClose, masterKomisi }) {
  const [activePhoto, setActivePhoto] = useState(null);

  const activeMasterKomisi = useMemo(() => {
    if (Array.isArray(masterKomisi) && masterKomisi.length > 0) return masterKomisi;
    try {
      const raw = localStorage.getItem("xnet_master_komisi");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return KOMISI_PEKERJAAN_MASTER;
  }, [masterKomisi]);

  if (!task) return null;

  // Ekstrak foto dari task (mendukung format evidence object atau field langsung)
  const fotoOpm = task.evidence?.foto_opm || task.foto_opm || null;
  const fotoDropcore = task.evidence?.foto_dropcore || task.foto_dropcore || null;
  const fotoModem = task.evidence?.foto_modem || task.foto_modem || null;

  const redaman = task.evidence?.redaman || task.redaman || null;
  const snModem = task.evidence?.sn_modem || task.sn_modem || task.serial_number || null;
  const odpPort = task.evidence?.odp_port || task.odp_port || task.odp || null;

  const dbmQuality = redaman ? getDbmQuality(redaman) : null;
  const totalPhotos = [fotoOpm, fotoDropcore, fotoModem].filter(Boolean).length;
  const taskIncentive = task.status === "SELESAI" ? calculateTaskIncentive(task, undefined, activeMasterKomisi) : null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex sm:items-center sm:justify-center p-0 sm:p-5 animate-in fade-in overflow-hidden">
      <div className="bg-white w-full max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-slate-100 mt-auto sm:my-auto max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Mobile Swipe Bar Indicator */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center bg-slate-50/70">
          <div className="w-12 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-slate-900 text-base">
                  Bukti Dokumentasi Lapangan
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                  {totalPhotos} Foto Tersimpan
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {task.pelanggan} · {task.jenis} · Tim: <span className="font-bold text-slate-700">{task.tim}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Parameter Kualitas & Redaman Optik */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Redaman Optik (OPM)
              </span>
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-base font-black text-slate-900">
                  {redaman ? `${redaman} dBm` : "Tidak dicatat"}
                </span>
              </div>
              {dbmQuality && (
                <span className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md border ${dbmQuality.color}`}>
                  {dbmQuality.label}
                </span>
              )}
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                SN / MAC ONT Modem
              </span>
              <div className="flex items-center gap-2">
                <Barcode className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs font-mono font-bold text-slate-900 break-all">
                  {snModem || "-"}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                ODP & Port
              </span>
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="text-xs font-bold text-slate-900 truncate">
                  {odpPort || task.odp || "-"}
                </span>
              </div>
            </div>
          </div>

          {/* Galeri 3 Foto Lapangan */}
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <span>Dokumentasi Visual Hasil Pekerjaan</span>
            </h4>

            {totalPhotos === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Belum ada foto dokumentasi diunggah</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pekerjaan ini diselesaikan sebelum fitur upload bukti lapangan diaktifkan.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Foto 1: Redaman OPM */}
                <PhotoItem
                  photo={fotoOpm}
                  title="1. Redaman OPM"
                  emptyLabel="Tanpa Foto OPM"
                  icon={Gauge}
                  onZoom={(p) => setActivePhoto(p)}
                />

                {/* Foto 2: Dropcore & Tiang */}
                <PhotoItem
                  photo={fotoDropcore}
                  title="2. Tiang & Dropcore"
                  emptyLabel="Tanpa Foto Dropcore"
                  icon={Network}
                  onZoom={(p) => setActivePhoto(p)}
                />

                {/* Foto 3: Barcode Modem */}
                <PhotoItem
                  photo={fotoModem}
                  title="3. Barcode Modem"
                  emptyLabel="Tanpa Foto Modem"
                  icon={Barcode}
                  onZoom={(p) => setActivePhoto(p)}
                />
              </div>
            )}
          </div>

          {/* Rincian Klaim Komisi Pekerjaan (Team Nexus) */}
          {taskIncentive && (
            <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Rincian Komisi Pekerjaan</h4>
                    <p className="text-[10px] text-slate-500">Berdasarkan Tabel Komisi Resmi Team Nexus</p>
                  </div>
                </div>
                <span className="text-sm font-black text-amber-700">
                  {formatRupiah(taskIncentive.total)}
                </span>
              </div>

              {Array.isArray(taskIncentive.items) && taskIncentive.items.length > 0 ? (
                <div className="divide-y divide-amber-100 bg-white rounded-xl border border-amber-100 overflow-hidden text-xs">
                  {taskIncentive.items.map((item, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800 text-[11px]">{item.nama}</p>
                        <p className="text-[10px] text-slate-400">
                          {item.qty} {item.satuan} × {formatRupiah(item.tarif)}
                        </p>
                      </div>
                      <span className="font-bold text-slate-900 text-xs">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-amber-800 font-medium">
                  Komisi Standar Jenis Tugas: {formatRupiah(taskIncentive.baseFee)}
                </p>
              )}
            </div>
          )}

          {/* Catatan / Keterangan Pelaksanaan */}
          {task.keterangan && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Catatan Pekerjaan:
              </span>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {task.keterangan}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200/80 flex items-center justify-between bg-white/95 backdrop-blur-md shrink-0 sticky bottom-0 z-20 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Tanggal: {task.tanggal || "Hari ini"}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 min-h-[42px] bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Lightbox / Zoom Foto Penuh */}
      {activePhoto && (
        <div
          onClick={() => setActivePhoto(null)}
          className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in"
        >
          <div className="w-full max-w-4xl flex items-center justify-between text-white pb-3">
            <span className="font-bold text-sm">{activePhoto.title}</span>
            <div className="flex items-center gap-2">
              <a
                href={activePhoto.url}
                download={`${task.pelanggan || "pekerjaan"}-${activePhoto.title}.jpg`}
                onClick={(e) => e.stopPropagation()}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                title="Unduh Foto"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <img
            src={activePhoto.url}
            alt={activePhoto.title}
            className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
