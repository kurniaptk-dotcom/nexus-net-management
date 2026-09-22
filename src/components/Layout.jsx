import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Wrench,
  Target,
  AlertTriangle,
  Network,
  FileText,
  Wifi,
  Menu,
  X,
  ChevronRight,
  Search,
  LogOut,
  Settings,
} from "lucide-react";
import { useState } from "react";
import NotificationPanel from "./NotificationPanel";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/tim", icon: Users, label: "Tim" },
  { to: "/pekerjaan", icon: Wrench, label: "Pekerjaan" },
  { to: "/leads", icon: Target, label: "Leads" },
  { to: "/gangguan", icon: AlertTriangle, label: "Gangguan" },
  { to: "/odp", icon: Network, label: "ODP / ODC" },
  { to: "/laporan", icon: FileText, label: "Laporan" },
];

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

  return (
    <div className="flex h-screen bg-[#F0F2F5]">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-gradient-to-b from-[#0D1B4A] via-[#0F2366] to-[#0D1B4A] text-white transform transition-all duration-300 lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-[72px]" : "w-64"}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
          <Logo collapsed={collapsed} />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-7 h-7 items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${collapsed ? "" : "rotate-180"}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-4 px-3 space-y-1 overflow-y-auto">
          {!collapsed && (
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest px-3 mb-2">
              Menu
            </p>
          )}
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-[#F59E0B] to-[#F97316] text-white shadow-lg shadow-orange-500/25"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                } ${collapsed ? "justify-center" : ""}`
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className={`p-3 border-t border-white/10 ${collapsed ? "px-2" : ""}`}>
          <div className={`flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer ${collapsed ? "justify-center" : ""}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#F97316] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              N
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">Nexus Admin</p>
                <p className="text-[11px] text-white/40 truncate">admin@nexus.net</p>
              </div>
            )}
            {!collapsed && (
              <LogOut className="w-4 h-4 text-white/40 hover:text-white transition-colors" />
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
              placeholder="Cari..."
              className="bg-transparent text-sm outline-none w-40 placeholder:text-gray-400"
            />
          </div>

          <NotificationPanel />

          <button className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
