// Sistem Role & Hak Akses Menu Nexus Net
// Mengatur preset role, daftar menu sistem, dan resolusi hak akses user

export const SYSTEM_MENUS = [
  {
    id: "dashboard",
    path: "/",
    label: "Dashboard",
    description: "Ringkasan metrik, grafik kinerja, dan monitoring operasional",
    iconName: "LayoutDashboard",
    category: "Utama",
  },
  {
    id: "teknisi-portal",
    path: "/teknisi",
    label: "Portal Teknisi",
    description: "Tugas harian teknisi, navigasi maps, input redaman dBm, & eksekusi cepat",
    iconName: "HardHat",
    category: "Operasional",
  },
  {
    id: "tim",
    path: "/tim",
    label: "Tim Teknisi",
    description: "Daftar regu teknisi lapangan dan pembagian personel",
    iconName: "Users",
    category: "Operasional",
  },
  {
    id: "pekerjaan",
    path: "/pekerjaan",
    label: "Pekerjaan Lapangan",
    description: "Kanban board & tabel pekerjaan instalasi, perbaikan, pemutusan",
    iconName: "Wrench",
    category: "Operasional",
  },
  {
    id: "leads",
    path: "/leads",
    label: "Manajemen Leads",
    description: "Calon pelanggan masuk dari iklan, marketing, dan affiliate",
    iconName: "Target",
    category: "Bisnis",
  },
  {
    id: "gangguan",
    path: "/gangguan",
    label: "Tiket Gangguan",
    description: "Pencatatan dan penanganan tiket keluhan / trouble pelanggan",
    iconName: "AlertTriangle",
    category: "Operasional",
  },
  {
    id: "odp",
    path: "/odp",
    label: "ODP / ODC",
    description: "Hierarki jaringan distribusi fiber optik dan kapasitas port",
    iconName: "Network",
    category: "Infrastruktur",
  },
  {
    id: "laporan",
    path: "/laporan",
    label: "Laporan & Ekspor",
    description: "Rekapitulasi data bulanan dan ekspor ke file Excel/CSV",
    iconName: "FileText",
    category: "Bisnis",
  },
  {
    id: "users",
    path: "/users",
    label: "Manajemen User",
    description: "Pengaturan akun pengguna, role, dan hak akses menu",
    iconName: "Shield",
    category: "Sistem",
    adminOnly: true,
  },
];

export const ROLE_PRESETS = [
  {
    id: "admin",
    label: "Administrator",
    badgeLabel: "Administrator",
    description: "Akses penuh tanpa batas ke seluruh modul sistem & manajemen akun",
    colorClass: "bg-[#0D1B4A] text-white",
    textColor: "text-[#0D1B4A]",
    borderColor: "border-[#0D1B4A]",
    defaultMenus: ["/", "/teknisi", "/tim", "/pekerjaan", "/leads", "/gangguan", "/odp", "/laporan", "/users"],
  },
  {
    id: "teknisi",
    label: "Teknisi Lapangan",
    badgeLabel: "Teknisi",
    description: "Fokus pada eksekusi pekerjaan lapangan, tiket gangguan, & cek ODP/ODC",
    colorClass: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300",
    textColor: "text-emerald-700",
    borderColor: "border-emerald-300",
    defaultMenus: ["/teknisi", "/pekerjaan", "/gangguan", "/odp"],
  },
  {
    id: "cs",
    label: "Customer Service / Helpdesk",
    badgeLabel: "CS / Helpdesk",
    description: "Pencatatan gangguan dari pelanggan dan follow up calon leads",
    colorClass: "bg-cyan-50 text-cyan-800 ring-1 ring-cyan-300",
    textColor: "text-cyan-700",
    borderColor: "border-cyan-300",
    defaultMenus: ["/", "/leads", "/gangguan"],
  },
  {
    id: "marketing",
    label: "Marketing / Sales",
    badgeLabel: "Marketing",
    description: "Monitoring calon pelanggan baru (leads) dan melihat laporan kinerja",
    colorClass: "bg-purple-50 text-purple-800 ring-1 ring-purple-300",
    textColor: "text-purple-700",
    borderColor: "border-purple-300",
    defaultMenus: ["/", "/leads", "/laporan"],
  },
  {
    id: "user",
    label: "Operator / Staff Umum",
    badgeLabel: "Operator",
    description: "Akses seluruh operasional harian standar kecuali manajemen user",
    colorClass: "bg-amber-50 text-amber-800 ring-1 ring-amber-300",
    textColor: "text-amber-800",
    borderColor: "border-amber-300",
    defaultMenus: ["/", "/teknisi", "/tim", "/pekerjaan", "/leads", "/gangguan", "/odp", "/laporan"],
  },
  {
    id: "custom",
    label: "Kustom / Khusus",
    badgeLabel: "Kustom",
    description: "Daftar akses menu dikonfigurasi secara manual dan spesifik",
    colorClass: "bg-slate-100 text-slate-800 ring-1 ring-slate-300",
    textColor: "text-slate-700",
    borderColor: "border-slate-300",
    defaultMenus: ["/", "/pekerjaan"],
  },
];

// Helper: Ambil semua role termasuk role kustom yang dibuat admin
export function getAllRoles() {
  try {
    const custom = localStorage.getItem("xnet_custom_roles");
    if (custom) {
      const parsed = JSON.parse(custom);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const systemIds = ROLE_PRESETS.map((r) => r.id);
        const filteredCustom = parsed.filter((c) => !systemIds.includes(c.id));
        return [...ROLE_PRESETS, ...filteredCustom];
      }
    }
  } catch (e) {
    console.warn("Error reading custom roles:", e);
  }
  return ROLE_PRESETS;
}

// Helper: Simpan daftar role kustom
export function saveCustomRoles(rolesList) {
  try {
    localStorage.setItem("xnet_custom_roles", JSON.stringify(rolesList));
  } catch (e) {
    console.warn("Error saving custom roles:", e);
  }
}

// Helper: Ambil info tampilan role
export function getRoleInfo(roleId) {
  const all = getAllRoles();
  const found = all.find((r) => r.id === roleId);
  if (found) return found;
  return {
    id: roleId || "user",
    label: roleId ? (roleId.charAt(0).toUpperCase() + roleId.slice(1)) : "Operator",
    badgeLabel: roleId ? (roleId.charAt(0).toUpperCase() + roleId.slice(1)) : "Operator",
    description: "Role pengguna sistem",
    colorClass: "bg-gray-100 text-gray-800 ring-1 ring-gray-300",
    textColor: "text-gray-700",
    borderColor: "border-gray-200",
    defaultMenus: ["/", "/pekerjaan"],
  };
}

// Helper: Ambil daftar path menu yang diizinkan untuk profil user
export function getUserAllowedMenus(profile) {
  if (!profile) return ["/"];

  // Admin selalu memiliki akses penuh ke semua menu
  if (profile.role === "admin") {
    return SYSTEM_MENUS.map((m) => m.path);
  }

  // 1. Cek apakah ada data allowed_menus langsung dari database
  if (Array.isArray(profile.allowed_menus) && profile.allowed_menus.length > 0) {
    return profile.allowed_menus;
  }

  // 2. Cek cache lokal permissions untuk user tersebut
  try {
    const local = localStorage.getItem(`xnet_perms_${profile.id}`);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed.allowedMenus) && parsed.allowedMenus.length > 0) {
        return parsed.allowedMenus;
      }
    }
  } catch (e) {
    console.warn("Error reading local permissions:", e);
  }

  // 3. Fallback ke default preset berdasarkan role
  const allRoles = getAllRoles();
  const preset = allRoles.find((r) => r.id === profile.role);
  if (preset && Array.isArray(preset.defaultMenus)) {
    return preset.defaultMenus;
  }

  // Default fallback aman
  return ["/", "/pekerjaan", "/gangguan"];
}

// Helper: Cek apakah user punya akses ke path tertentu
export function hasMenuAccess(profile, path) {
  if (!profile) return false;
  if (profile.role === "admin") return true;
  if (path === "/users") return false; // Hanya admin yang boleh buka manajemen user
  
  const allowed = getUserAllowedMenus(profile);
  // Match persis atau root path
  return allowed.includes(path) || allowed.includes(path.replace(/\/$/, ""));
}

// Helper: Simpan permissions ke cache lokal dan sinkronisasi
export function cacheUserPermissions(userId, role, allowedMenus) {
  try {
    localStorage.setItem(
      `xnet_perms_${userId}`,
      JSON.stringify({
        role,
        allowedMenus,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch (e) {
    console.warn("Failed caching permissions:", e);
  }
}
