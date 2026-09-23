import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Wrench,
  Target,
  AlertTriangle,
  Network,
  FileText,
  Menu,
  ChevronRight,
  Search,
  LogOut,
  Settings,
  Shield,
  X,
  Database,
  RefreshCw,
  CheckCircle2,
  Smartphone,
  Download,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import NotificationPanel from "./NotificationPanel";

function Logo({ collapsed }) {
  return (
    <div className="flex items-center justify-center">
      <img
        src="/LogoNexusputihoren.png"
        alt="Xnet Logo"
        className={`${collapsed ? "w-10 h-10" : "w-[120px] h-auto"} object-contain`}
      />
    </div>
  );
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter" && globalSearch.trim()) {
      navigate(`/pekerjaan?search=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  const handleClearCache = () => {
    if (confirm("Apakah Anda yakin ingin mereset cache lokal aplikasi? Data offline di browser akan dikembalikan ke state awal.")) {
      const keys = ["xnet_pekerjaan", "xnet_leads", "xnet_gangguan", "xnet_tim", "xnet_odpodc", "xnet_notifications"];
      keys.forEach((k) => localStorage.removeItem(k));
      window.location.reload();
    }
  };

  const allNavItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/tim", icon: Users, label: "Tim" },
    { to: "/pekerjaan", icon: Wrench, label: "Pekerjaan" },
    { to: "/leads", icon: Target, label: "Leads" },
    { to: "/gangguan", icon: AlertTriangle, label: "Gangguan" },
    { to: "/odp", icon: Network, label: "ODP / ODC" },
    { to: "/laporan", icon: FileText, label: "Laporan" },
    ...(profile?.role === "admin" ? [{ to: "/users", icon: Shield, label: "Manajemen User" }] : []),
  ];

  return (
    <div className="flex h-screen bg-[#F0F2F5]">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-gradient-to-b from-[#0D1B4A] via-[#0F2366] to-[#0D1B4A] text-white transform transition-all duration-300 lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-20" : "w-64"}`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <Logo collapsed={collapsed} />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <ChevronRight className={`w-4 h-4 transform transition-transform ${collapsed ? "" : "rotate-180"}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {allNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-[#F59E0B] to-[#F97316] text-[#0D1B4A] font-bold shadow-lg shadow-orange-500/20"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                } ${collapsed ? "justify-center px-2" : ""}`
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* PWA Install Button */}
        <div className="px-3 py-2 border-t border-white/5">
          <button
            onClick={() => window.__showPwaInstallPrompt && window.__showPwaInstallPrompt()}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-amber-400 hover:text-amber-300 text-xs font-semibold transition-all border border-amber-400/20 shadow-sm"
            title="Install aplikasi ke HP atau Desktop"
          >
            <Smartphone className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Install Aplikasi (PWA)</span>}
          </button>
        </div>

        {/* User Info */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#F97316] flex items-center justify-center font-bold text-sm text-[#0D1B4A] flex-shrink-0">
              {profile?.full_name?.[0]?.toUpperCase() || "U"}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{profile?.full_name || "User"}</p>
                <p className="text-[11px] text-white/40 truncate">{profile?.email}</p>
              </div>
            )}
            {!collapsed && (
              <button onClick={signOut} title="Keluar" className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-red-400 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Bar */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/60 px-4 md:px-6 py-3 flex items-center gap-4 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-500"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-800">Nexus Net Dashboard</h2>
            <p className="text-xs text-gray-400">September 2026 - WiFi Management</p>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari pekerjaan lalu Enter..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="bg-transparent text-sm outline-none w-48 placeholder:text-gray-400"
            />
          </div>

          <NotificationPanel />

          <button
            onClick={() => setSettingsOpen(true)}
            title="Pengaturan Sistem"
            className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-[#0D1B4A] to-[#1a237e] text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                Pengaturan Sistem & Profil
              </h3>
              <button
                onClick={() => setSettingsOpen(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Profile Card */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0D1B4A] to-[#1a237e] text-amber-400 font-extrabold text-lg flex items-center justify-center shadow-sm">
                  {profile?.full_name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{profile?.full_name || "User Nexus"}</p>
                  <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                    Role: {profile?.role || "teknisi"}
                  </span>
                </div>
              </div>

              {/* Status Connection */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Koneksi & Cloud</h4>
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-white">
                  <div className="flex items-center gap-2.5">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-gray-800">Supabase Cloud Database</p>
                      <p className="text-[11px] text-gray-400">PostgreSQL Cloud Sync</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="w-3 h-3" /> Aktif
                  </span>
                </div>
              </div>

              {/* PWA Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Aplikasi Mobile / PWA</h4>
                <div className="p-3.5 rounded-xl border border-gray-100 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="w-4 h-4 text-[#0D1B4A]" />
                    <div>
                      <p className="text-xs font-bold text-gray-800">Progressive Web App</p>
                      <p className="text-[11px] text-gray-400">Bisa dipasang di Android, iOS, & PC</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSettingsOpen(false);
                      if (window.__showPwaInstallPrompt) window.__showPwaInstallPrompt();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#0D1B4A] to-[#1a237e] text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow-md transition-all active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Pasang</span>
                  </button>
                </div>
              </div>

              {/* Maintenance & Cache */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Penyimpanan Offline</h4>
                <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-800">Reset Cache Lokal</p>
                    <p className="text-[11px] text-gray-400">Bersihkan data offline di browser</p>
                  </div>
                  <button
                    onClick={handleClearCache}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-red-600 hover:border-red-200 rounded-lg text-xs font-semibold transition-all shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* App Info */}
              <div className="pt-2 border-t border-gray-100 text-center">
                <p className="text-xs font-bold text-gray-700">Nexus Net WiFi Manager v2.0</p>
                <p className="text-[11px] text-gray-400 mt-0.5">© 2026 PT Kurnia Net Solusindo. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
