import { useState, useRef, useEffect } from "react";
import {
  Bell,
  X,
  CheckCircle,
  AlertTriangle,
  Target,
  Wrench,
  Info,
  Trash2,
  CheckCheck,
  Clock,
  ChevronRight,
} from "lucide-react";
import {
  initialNotifications,
  formatWaktuRelatif,
  generatePekerjaanNotification,
  generateGangguanNotification,
  generateLeadsNotification,
  generateNotifikasi,
} from "../store/notificationStore";

const iconMap = {
  wrench: Wrench,
  alert: AlertTriangle,
  target: Target,
  check: CheckCircle,
  x: X,
  edit: Wrench,
  info: Info,
};

const colorMap = {
  tambah: "bg-blue-500",
  status: "bg-emerald-500",
  hapus: "bg-red-500",
  edit: "bg-amber-500",
  gangguan: "bg-red-500",
  leads: "bg-[#F59E0B]",
  info: "bg-gray-400",
};

export default function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem("xnet_notifications");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Error loading notifications from localStorage:", e);
    }
    return initialNotifications;
  });
  const [filter, setFilter] = useState("all"); // all, unread, pekerjaan, gangguan, leads
  const panelRef = useRef(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("xnet_notifications", JSON.stringify(notifications));
    } catch (e) {
      console.warn("Error saving notifications to localStorage:", e);
    }
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.dibaca).length;

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Expose addNotification globally for other components
  useEffect(() => {
    window.__addNotification = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    };
    return () => { delete window.__addNotification; };
  }, []);

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.dibaca;
    if (filter === "pekerjaan") return n.type === "pekerjaan";
    if (filter === "gangguan") return n.type === "gangguan";
    if (filter === "leads") return n.type === "leads";
    return true;
  });

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, dibaca: true } : n))
    );
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, dibaca: true })));
  };

  const deleteNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const filters = [
    { key: "all", label: "Semua" },
    { key: "unread", label: "Belum Dibaca" },
    { key: "pekerjaan", label: "Pekerjaan" },
    { key: "gangguan", label: "Gangguan" },
    { key: "leads", label: "Leads" },
  ];

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[520px] bg-white rounded-2xl shadow-2xl shadow-black/15 border border-gray-100 overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-[#0D1B4A] to-[#1a237e]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-white" />
                <h3 className="text-sm font-bold text-white">Notifikasi</h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-[#F59E0B] text-white text-[10px] font-bold rounded-full">
                    {unreadCount} baru
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={markAllRead}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                  title="Tandai semua dibaca"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={clearAll}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                  title="Hapus semua"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="px-3 py-2 border-b border-gray-100 flex gap-1 overflow-x-auto">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                  filter === f.key
                    ? "bg-[#0D1B4A] text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto max-h-[340px] divide-y divide-gray-50">
            {filteredNotifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400 font-medium">Tidak ada notifikasi</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const Icon = iconMap[notif.icon] || Info;
                const bgColor = colorMap[notif.kategori] || colorMap.info;
                return (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className={`px-4 py-3 hover:bg-gray-50/80 transition-colors cursor-pointer group ${
                      !notif.dibaca ? "bg-blue-50/30" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-semibold ${!notif.dibaca ? "text-gray-900" : "text-gray-700"} line-clamp-1`}>
                            {notif.judul}
                          </p>
                          {!notif.dibaca && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.deskripsi}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-center gap-1 text-[10px] text-gray-400">
                            <Clock className="w-3 h-3" />
                            {formatWaktuRelatif(notif.waktu)}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notif.id);
                            }}
                            className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
              <button className="w-full text-center text-xs font-semibold text-[#0D1B4A] hover:text-[#F59E0B] transition-colors">
                Lihat Semua Log Perubahan →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { initialNotifications };
