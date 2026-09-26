import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
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
  MoreHorizontal,
  HardHat,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import NotificationPanel from "./NotificationPanel";
import { getUserAllowedMenus, getRoleInfo } from "../lib/permissions";

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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter" && globalSearch.trim()) {
      navigate(`/pekerjaan?search=${encodeURIComponent(globalSearch.trim())}`);
      setMobileSearchOpen(false);
    }
  };

  const handleClearCache = () => {
    if (confirm("Apakah Anda yakin ingin mereset cache lokal aplikasi? Data offline di browser akan dikembalikan ke state awal.")) {
      const keys = [
        "xnet_pekerjaan",
        "xnet_leads",
        "xnet_gangguan",
        "xnet_daftar_gangguan_v2",
        "xnet_tim",
        "xnet_odpodc",
        "xnet_odc_list",
        "xnet_notifications",
      ];
      keys.forEach((k) => localStorage.removeItem(k));
      window.location.reload();
    }
  };

  const roleInfo = useMemo(() => getRoleInfo(profile?.role), [profile?.role]);
  const allowedPaths = useMemo(() => getUserAllowedMenus(profile), [profile]);

  const allNavItems = useMemo(() => {
    const rawItems = [
      { to: "/", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/teknisi", icon: HardHat, label: "Portal Teknisi" },
      { to: "/tim", icon: Users, label: "Tim" },
      { to: "/pekerjaan", icon: Wrench, label: "Pekerjaan" },
      { to: "/leads", icon: Target, label: "Leads" },
      { to: "/gangguan", icon: AlertTriangle, label: "Gangguan" },
      { to: "/odp", icon: Network, label: "ODP / ODC" },
      { to: "/laporan", icon: FileText, label: "Laporan" },
      ...(profile?.role === "admin" ? [{ to: "/users", icon: Shield, label: "Manajemen User" }] : []),
    ];

    if (profile?.role === "admin") return rawItems;
    return rawItems.filter((item) => allowedPaths.includes(item.to));
  }, [profile, allowedPaths]);

  // Primary navigation for mobile bottom bar (ambil 4 menu terpenting yang diizinkan)
  const bottomNavItems = useMemo(() => {
    const defaultPriority = [
      { to: "/teknisi", icon: HardHat, label: "Teknisi" },
      { to: "/", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/pekerjaan", icon: Wrench, label: "Pekerjaan" },
      { to: "/gangguan", icon: AlertTriangle, label: "Gangguan" },
      { to: "/odp", icon: Network, label: "ODP" },
      { to: "/leads", icon: Target, label: "Leads" },
      { to: "/tim", icon: Users, label: "Tim" },
      { to: "/laporan", icon: FileText, label: "Laporan" },
    ];
    if (profile?.role === "admin") return defaultPriority.slice(0, 4);
    const filtered = defaultPriority.filter((item) => allowedPaths.includes(item.to));
    return filtered.slice(0, 4);
  }, [profile, allowedPaths]);

  // Current page title mapping
  const pageTitles = {
    "/": "Nexus Net Dashboard",
    "/teknisi": "Portal Lapangan Teknisi",
    "/tim": "Manajemen Tim",
    "/pekerjaan": "Manajemen Pekerjaan",
    "/leads": "Manajemen Leads",
    "/gangguan": "Daftar Gangguan",
    "/odp": "Hierarki ODP / ODC",
    "/laporan": "Rekapitulasi Laporan",
    "/users": "Manajemen Pengguna",
  };
  const currentTitle = pageTitles[location.pathname] || "Nexus Net Management";

  return (
    <div className="flex h-screen bg-[#F0F2F5]">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#0D1B4A] text-white transform transition-all duration-300 lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-20" : "w-64 max-w-[80vw]"}`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <Logo collapsed={collapsed} />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className={`w-4 h-4 transform transition-transform ${collapsed ? "" : "rotate-180"}`} />
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
                    ? "bg-[#F59E0B] text-[#0D1B4A] font-bold shadow-sm"
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
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-amber-400 hover:text-amber-300 text-xs font-semibold transition-all border border-amber-400/20 shadow-sm cursor-pointer"
            title="Install aplikasi ke HP atau Desktop"
          >
            <Smartphone className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Install Aplikasi (PWA)</span>}
          </button>
        </div>

        {/* User Info */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5">
            <div className="w-9 h-9 rounded-xl bg-[#F59E0B] flex items-center justify-center font-bold text-sm text-[#0D1B4A] flex-shrink-0">
              {profile?.full_name?.[0]?.toUpperCase() || "U"}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{profile?.full_name || "User"}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/30">
                    {roleInfo.badgeLabel}
                  </span>
                </div>
              </div>
            )}
            {!collapsed && (
              <button onClick={signOut} title="Keluar" className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-red-400 transition-colors cursor-pointer">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Bar */}
        <header className="bg-white/90 backdrop-blur-xl border-b border-gray-200/70 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-600 active:scale-95 transition-all cursor-pointer"
              title="Buka Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight truncate">
                {currentTitle}
              </h2>
              <p className="text-[10px] sm:text-xs text-gray-400 truncate">
                Nexus Net WiFi Management · September 2026
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Desktop Search */}
            <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-1.5 border border-gray-200/60 focus-within:border-[#0D1B4A] focus-within:bg-white transition-all">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari pekerjaan lalu Enter..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="bg-transparent text-xs sm:text-sm outline-none w-44 placeholder:text-gray-400"
              />
            </div>

            {/* Mobile Search Button */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="md:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-600 active:scale-95 transition-colors cursor-pointer"
              title="Cari"
            >
              <Search className="w-4.5 h-4.5" />
            </button>

            <NotificationPanel />

            <button
              onClick={() => setSettingsOpen(true)}
              title="Pengaturan Sistem"
              className="p-2 sm:p-2.5 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
            >
              <Settings className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </button>
          </div>
        </header>

        {/* Mobile Search Input Drawer (Dropdown) */}
        {mobileSearchOpen && (
          <div className="md:hidden bg-white border-b border-gray-200 px-3 py-2.5 flex items-center gap-2 shadow-md animate-fade-in z-20">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Cari pekerjaan (nama, ODP, dll) lalu Enter..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              autoFocus
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#0D1B4A]"
            />
            <button
              onClick={() => setMobileSearchOpen(false)}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Page Content with bottom padding for mobile navigation bar */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-6 pb-24 lg:pb-6">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/90 px-2 py-1 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] flex items-center justify-around pb-[calc(0.25rem+env(safe-area-inset-bottom))]">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                  isActive
                    ? "text-[#0D1B4A] font-extrabold scale-105"
                    : "text-gray-400 hover:text-gray-600 font-medium"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`p-1 rounded-xl transition-all ${
                      isActive ? "bg-amber-100 text-[#0D1B4A]" : ""
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* More / Menu trigger in Bottom Nav */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center py-1 px-3 rounded-xl text-gray-400 hover:text-gray-700 font-medium transition-all cursor-pointer"
          >
            <div className="p-1 rounded-xl">
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight">Menu</span>
          </button>
        </nav>
      </div>

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-[#0D1B4A] text-white flex items-center justify-between">
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
                <div className="w-12 h-12 rounded-xl bg-[#0D1B4A] text-amber-400 font-extrabold text-lg flex items-center justify-center shadow-sm">
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
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0D1B4A] hover:bg-[#152763] text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow-md transition-all active:scale-95"
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
