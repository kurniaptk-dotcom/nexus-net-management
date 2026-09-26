import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import {
  Users,
  Plus,
  Trash2,
  Shield,
  User,
  Search,
  Edit,
  ShieldAlert,
  UserCheck,
  AlertTriangle,
  X,
  Check,
  Database,
  Copy,
  CheckCheck,
  Wrench,
  Phone,
  Target,
  LayoutDashboard,
  Network,
  FileText,
  HardHat,
  Sliders,
  Settings,
  Sparkles,
} from "lucide-react";
import Toast from "../components/Toast";
import { initialTimData } from "../data/mockData";
import { usePersistState } from "../hooks/usePersistState";
import {
  SYSTEM_MENUS,
  ROLE_PRESETS,
  getAllRoles,
  saveCustomRoles,
  getRoleInfo,
  getUserAllowedMenus,
} from "../lib/permissions";

const MENU_ICONS = {
  LayoutDashboard,
  HardHat,
  Users,
  Wrench,
  Target,
  AlertTriangle,
  Network,
  FileText,
  Shield,
};

const COLOR_OPTIONS = [
  { id: "blue", label: "Navy Blue", colorClass: "bg-[#0D1B4A] text-white" },
  { id: "emerald", label: "Emerald Green", colorClass: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300" },
  { id: "cyan", label: "Cyan Blue", colorClass: "bg-cyan-50 text-cyan-800 ring-1 ring-cyan-300" },
  { id: "purple", label: "Purple", colorClass: "bg-purple-50 text-purple-800 ring-1 ring-purple-300" },
  { id: "amber", label: "Amber Orange", colorClass: "bg-amber-50 text-amber-800 ring-1 ring-amber-300" },
  { id: "rose", label: "Rose Red", colorClass: "bg-rose-50 text-rose-800 ring-1 ring-rose-300" },
  { id: "slate", label: "Slate Gray", colorClass: "bg-slate-100 text-slate-800 ring-1 ring-slate-300" },
];

export default function ManajemenUser() {
  const { profile, signUp, deleteUser, deleteUserCompletely, updateProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamList] = usePersistState("xnet_tim", initialTimData);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // Dynamic Roles List (Custom Roles + Presets)
  const [rolesList, setRolesList] = useState(() => getAllRoles());

  // Add User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "teknisi",
    allowed_menus: ["/teknisi"],
    tim: "",
  });
  const [addError, setAddError] = useState("");
  const [savingAdd, setSavingAdd] = useState(false);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    role: "user",
    allowed_menus: [],
    tim: "",
  });
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Create Role Modal State
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({
    label: "",
    description: "",
    color: "emerald",
    menus: ["/", "/pekerjaan", "/gangguan"],
  });
  const [roleError, setRoleError] = useState("");

  // Delete Confirmation Modal State
  const [deletingUser, setDeletingUser] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  // SQL Script Modal State
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Toast
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });
  const triggerToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  };

  useEffect(() => {
    fetchUsers();
    setRolesList(getAllRoles());
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      triggerToast("Gagal memuat daftar user: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(search.toLowerCase());
      const matchRole = filterRole === "all" || u.role === filterRole;
      return matchSearch && matchRole;
    });
  }, [users, search, filterRole]);

  // Handle Add User
  async function handleAdd(e) {
    e.preventDefault();
    setAddError("");

    if (!addForm.email || !addForm.password) {
      setAddError("Email dan password wajib diisi.");
      return;
    }
    if (addForm.password.length < 6) {
      setAddError("Password minimal 6 karakter.");
      return;
    }

    setSavingAdd(true);
    try {
      await signUp(
        addForm.email.trim(),
        addForm.password,
        addForm.full_name.trim(),
        addForm.role,
        addForm.allowed_menus,
        addForm.tim || ""
      );
      setShowAddModal(false);
      setAddForm({
        email: "",
        password: "",
        full_name: "",
        role: "teknisi",
        allowed_menus: ["/teknisi"],
        tim: "",
      });
      triggerToast("User baru berhasil ditambahkan!", "success");
      await fetchUsers();
    } catch (err) {
      setAddError(err.message);
    } finally {
      setSavingAdd(false);
    }
  }

  // Open Edit User Modal
  function openEditModal(userItem) {
    const userRole = userItem.role || "user";
    const allowed = getUserAllowedMenus(userItem);

    // Dapatkan tim jika tersimpan di profil atau cache lokal
    let userTeam = userItem.tim || "";
    if (!userTeam) {
      try {
        const local = localStorage.getItem(`xnet_perms_${userItem.id}`);
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed.tim) userTeam = parsed.tim;
        }
      } catch (e) {}
    }

    setEditingUser(userItem);
    setEditForm({
      full_name: userItem.full_name || "",
      role: userRole,
      allowed_menus: allowed,
      tim: userTeam,
    });
    setEditError("");
  }

  // Handle Save Edit User
  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingUser) return;
    setEditError("");
    setSavingEdit(true);

    try {
      if (editingUser.id === profile?.id && editForm.role !== "admin") {
        setEditError("Anda tidak dapat mencabut hak akses Admin dari akun Anda sendiri.");
        setSavingEdit(false);
        return;
      }

      await updateProfile(editingUser.id, {
        full_name: editForm.full_name.trim(),
        role: editForm.role,
        allowed_menus: editForm.allowed_menus,
        tim: editForm.tim || "",
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                full_name: editForm.full_name.trim(),
                role: editForm.role,
                allowed_menus: editForm.allowed_menus,
                tim: editForm.tim || "",
              }
            : u
        )
      );
      setEditingUser(null);
      triggerToast("Profil dan penugasan tim berhasil diperbarui!", "success");
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  // Handle Delete User
  async function confirmDeleteUser() {
    if (!deletingUser) return;

    if (deletingUser.id === profile?.id) {
      triggerToast("Anda tidak bisa menghapus akun Anda sendiri.", "error");
      setDeletingUser(null);
      return;
    }

    setDeletingLoading(true);
    try {
      if (deleteUserCompletely) {
        await deleteUserCompletely(deletingUser.id);
      } else {
        await deleteUser(deletingUser.id);
      }
      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
      triggerToast(`User "${deletingUser.full_name || deletingUser.email}" berhasil dihapus.`, "success");
      setDeletingUser(null);
    } catch (err) {
      triggerToast("Gagal menghapus user: " + err.message, "error");
    } finally {
      setDeletingLoading(false);
    }
  }

  // Role Selection Change inside User Forms
  function handleFormRoleChange(roleId, isAdd = false) {
    const roleObj = rolesList.find((r) => r.id === roleId);
    const defaultMenus = roleObj?.defaultMenus || roleObj?.menus || ["/", "/pekerjaan"];

    if (isAdd) {
      setAddForm((prev) => ({
        ...prev,
        role: roleId,
        allowed_menus: defaultMenus,
      }));
    } else {
      setEditForm((prev) => ({
        ...prev,
        role: roleId,
        allowed_menus: defaultMenus,
      }));
    }
  }

  // Toggle Menu Checkbox inside User Forms
  function handleMenuToggle(menuPath, isAdd = false) {
    if (isAdd) {
      setAddForm((prev) => {
        const current = prev.allowed_menus || [];
        const next = current.includes(menuPath)
          ? current.filter((p) => p !== menuPath)
          : [...current, menuPath];
        return { ...prev, allowed_menus: next };
      });
    } else {
      setEditForm((prev) => {
        const current = prev.allowed_menus || [];
        const next = current.includes(menuPath)
          ? current.filter((p) => p !== menuPath)
          : [...current, menuPath];
        return { ...prev, allowed_menus: next };
      });
    }
  }

  // Select all menus
  function handleSelectAllMenus(isAdd = false) {
    const allPaths = SYSTEM_MENUS.filter((m) => !m.adminOnly).map((m) => m.path);
    if (isAdd) {
      setAddForm((prev) => ({
        ...prev,
        allowed_menus: prev.role === "admin" ? SYSTEM_MENUS.map((m) => m.path) : allPaths,
      }));
    } else {
      setEditForm((prev) => ({
        ...prev,
        allowed_menus: prev.role === "admin" ? SYSTEM_MENUS.map((m) => m.path) : allPaths,
      }));
    }
  }

  // Reset to role's default menus
  function handleResetToRoleDefault(isAdd = false) {
    const currentRole = isAdd ? addForm.role : editForm.role;
    const roleObj = rolesList.find((r) => r.id === currentRole);
    const defaults = roleObj?.defaultMenus || roleObj?.menus || ["/", "/pekerjaan"];
    if (isAdd) {
      setAddForm((prev) => ({ ...prev, allowed_menus: defaults }));
    } else {
      setEditForm((prev) => ({ ...prev, allowed_menus: defaults }));
    }
  }

  // Handle Save New Custom Role
  function handleCreateRole(e) {
    e.preventDefault();
    setRoleError("");

    if (!newRoleForm.label.trim()) {
      setRoleError("Nama role wajib diisi.");
      return;
    }

    const roleId = newRoleForm.label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/^_+|_+$/g, "");

    if (rolesList.some((r) => r.id === roleId)) {
      setRoleError("Role dengan ID / nama serupa sudah ada. Gunakan nama lain.");
      return;
    }

    const selectedColor = COLOR_OPTIONS.find((c) => c.id === newRoleForm.color) || COLOR_OPTIONS[1];

    const newRole = {
      id: roleId,
      label: newRoleForm.label.trim(),
      badgeLabel: newRoleForm.label.trim(),
      description: newRoleForm.description.trim() || `Hak akses untuk tim ${newRoleForm.label}`,
      colorClass: selectedColor.colorClass,
      defaultMenus: newRoleForm.menus,
      isSystem: false,
    };

    const updatedRoles = [...rolesList, newRole];
    setRolesList(updatedRoles);
    saveCustomRoles(updatedRoles.filter((r) => !r.isSystem));

    triggerToast(`Role "${newRole.label}" berhasil dibuat!`, "success");
    setShowRoleModal(false);
    setNewRoleForm({
      label: "",
      description: "",
      color: "emerald",
      menus: ["/", "/pekerjaan", "/gangguan"],
    });
  }

  // Handle Delete Custom Role
  function handleDeleteRole(roleId) {
    if (confirm(`Hapus role ini? Pengguna dengan role ini akan tetap ada.`)) {
      const updated = rolesList.filter((r) => r.id !== roleId);
      setRolesList(updated);
      saveCustomRoles(updated.filter((r) => !r.isSystem));
      triggerToast("Role kustom berhasil dihapus.", "info");
    }
  }

  // Toggle Menu inside Create Role Modal
  function handleToggleNewRoleMenu(menuPath) {
    setNewRoleForm((prev) => {
      const current = prev.menus || [];
      const next = current.includes(menuPath)
        ? current.filter((p) => p !== menuPath)
        : [...current, menuPath];
      return { ...prev, menus: next };
    });
  }

  const sqlMigrationContent = `-- Nexus Net Management: Migrasi Role & Hak Akses
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allowed_menus text[] DEFAULT ARRAY['/', '/pekerjaan', '/gangguan']::text[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_role_title text DEFAULT '';

UPDATE profiles
SET allowed_menus = ARRAY['/', '/teknisi', '/tim', '/pekerjaan', '/leads', '/gangguan', '/odp', '/laporan', '/users']::text[]
WHERE role = 'admin';

UPDATE profiles
SET allowed_menus = ARRAY['/teknisi', '/pekerjaan', '/gangguan', '/odp']::text[]
WHERE role = 'teknisi';`;

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlMigrationContent);
    setCopiedSql(true);
    triggerToast("Script SQL berhasil disalin ke clipboard!", "success");
    setTimeout(() => setCopiedSql(false), 3000);
  };

  if (profile?.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[65vh]">
        <div className="text-center p-8 max-w-sm bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Akses Dibatasi</h2>
          <p className="text-gray-500 text-xs mt-2 leading-relaxed">
            Halaman Manajemen User hanya dapat diakses oleh akun dengan wewenang <strong>Administrator</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Manajemen Pengguna & Role
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Atur wewenang pengguna, buat role kustom, dan checklist akses menu spesifik
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowRoleModal(true)}
            className="flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3.5 py-2.5 rounded-xl text-sm font-bold border border-indigo-200 transition-all cursor-pointer"
            title="Buat role baru dengan izin menu khusus"
          >
            <Sliders className="w-4 h-4" />
            <span>+ Tambah Role Baru</span>
          </button>

          <button
            onClick={() => setShowSqlModal(true)}
            className="flex items-center justify-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 px-3 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 transition-all cursor-pointer"
            title="Script SQL untuk Supabase Cloud"
          >
            <Database className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Script SQL</span>
          </button>

          <button
            onClick={() => {
              setShowAddModal(true);
              setAddError("");
            }}
            className="flex items-center justify-center gap-2 bg-[#0D1B4A] hover:bg-[#1a237e] text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Akun Baru</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Akun</p>
            <p className="text-xl sm:text-3xl font-black text-gray-900 mt-0.5">{users.length}</p>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 flex items-center justify-center text-[#0D1B4A] shrink-0">
            <Users className="w-4.5 h-4.5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">Administrator</p>
            <p className="text-xl sm:text-3xl font-black text-[#0D1B4A] mt-0.5">
              {users.filter((u) => u.role === "admin").length}
            </p>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-700 shrink-0">
            <Shield className="w-4.5 h-4.5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">Teknisi Lapangan</p>
            <p className="text-xl sm:text-3xl font-black text-emerald-600 mt-0.5">
              {users.filter((u) => u.role === "teknisi").length}
            </p>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <HardHat className="w-4.5 h-4.5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Role Sistem</p>
            <p className="text-xl sm:text-3xl font-black text-purple-600 mt-0.5">
              {rolesList.length}
            </p>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
            <Sliders className="w-4.5 h-4.5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Cari nama atau email pengguna..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none transition-all placeholder:text-gray-400"
          />
        </div>

        {/* Filter Role Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
          <button
            onClick={() => setFilterRole("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filterRole === "all"
                ? "bg-[#0D1B4A] text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Semua Role
          </button>
          {rolesList.map((r) => (
            <button
              key={r.id}
              onClick={() => setFilterRole(r.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filterRole === r.id
                  ? "bg-[#0D1B4A] text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {r.badgeLabel || r.label}
            </button>
          ))}
        </div>
      </div>

      {/* User Table & Mobile Cards */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {/* Mobile Card List (sm:hidden) */}
        <div className="sm:hidden divide-y divide-gray-100">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-400">
              <div className="w-5 h-5 border-2 border-[#0D1B4A]/20 border-t-[#0D1B4A] rounded-full animate-spin mx-auto mb-2" />
              Memuat pengguna...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              Tidak ada akun yang sesuai pencarian.
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isSelf = u.id === profile?.id;
              const rInfo = getRoleInfo(u.role);
              const allowed = getUserAllowedMenus(u);
              return (
                <div key={u.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-[#0D1B4A] text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {u.full_name ? u.full_name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-gray-900 text-sm truncate">{u.full_name || "(Tanpa nama)"}</span>
                          {isSelf && (
                            <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 text-[9px] font-bold rounded ring-1 ring-blue-200">
                              Anda
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 font-mono truncate">{u.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditModal(u)}
                        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-blue-600 bg-gray-50 rounded-xl border border-gray-200"
                        title="Edit Profil & Hak Akses"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      {!isSelf && (
                        <button
                          onClick={() => setDeletingUser(u)}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-rose-600 bg-gray-50 rounded-xl border border-gray-200"
                          title="Hapus User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Role & Allowed Menus */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${rInfo.colorClass}`}>
                        {u.role === "admin" ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {rInfo.label}
                      </span>
                      {u.tim && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <HardHat className="w-3 h-3 text-amber-600" />
                          <span>Tim: {u.tim}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-wrap pt-1">
                      {u.role === "admin" ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                          Akses Semua Menu (Penuh)
                        </span>
                      ) : (
                        SYSTEM_MENUS.filter((m) => allowed.includes(m.path)).map((m) => (
                          <span key={m.id} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-700">
                            {m.label}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/70 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wider">
                  Pengguna
                </th>
                <th className="text-left px-5 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wider">
                  Email
                </th>
                <th className="text-left px-5 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wider">
                  Hak Akses / Role
                </th>
                <th className="text-left px-5 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wider">
                  Izin Akses Menu (Checklist)
                </th>
                <th className="text-left px-5 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wider">
                  Terdaftar
                </th>
                <th className="text-right px-5 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm text-gray-400">
                    <div className="w-5 h-5 border-2 border-[#0D1B4A]/20 border-t-[#0D1B4A] rounded-full animate-spin mx-auto mb-2" />
                    Memuat daftar pengguna...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-gray-400 text-sm">
                    Tidak ada akun yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = u.id === profile?.id;
                  const rInfo = getRoleInfo(u.role);
                  const allowed = getUserAllowedMenus(u);
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Name & Avatar */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#0D1B4A] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {u.full_name ? u.full_name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900 truncate">
                                {u.full_name || "(Tanpa nama)"}
                              </span>
                              {isSelf && (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md ring-1 ring-blue-200">
                                  Anda
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 sm:hidden truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-3.5 text-gray-600 font-mono text-xs">
                        {u.email}
                      </td>

                      {/* Role Pill & Assigned Team */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1 items-start">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer hover:shadow-xs ${rInfo.colorClass}`}
                            title="Klik untuk ubah role & checklist menu"
                          >
                            {u.role === "admin" ? (
                              <Shield className="w-3.5 h-3.5" />
                            ) : (
                              <User className="w-3.5 h-3.5" />
                            )}
                            <span>{rInfo.label}</span>
                          </button>
                          {u.tim && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <HardHat className="w-3 h-3 text-amber-600" />
                              <span>Tim: {u.tim}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Checklist Akses Menu Badges */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap max-w-md">
                          {u.role === "admin" ? (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-800 text-[11px] font-semibold rounded-lg ring-1 ring-blue-200">
                              Semua Menu (Akses Penuh)
                            </span>
                          ) : (
                            <>
                              {SYSTEM_MENUS.filter((m) => allowed.includes(m.path))
                                .slice(0, 4)
                                .map((m) => (
                                  <span
                                    key={m.id}
                                    className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[11px] font-medium rounded-lg"
                                  >
                                    {m.label}
                                  </span>
                                ))}
                              {SYSTEM_MENUS.filter((m) => allowed.includes(m.path)).length > 4 && (
                                <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-[10px] font-bold rounded">
                                  +{SYSTEM_MENUS.filter((m) => allowed.includes(m.path)).length - 4}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                            title="Edit profil & checklist menu"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => setDeletingUser(u)}
                              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              title="Hapus akun pengguna"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: EDIT PROFIL PENGGUNA & CHECKLIST AKSES MENU     */}
      {/* ======================================================== */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-5 sm:p-7 border border-gray-100 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Profil Pengguna</h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{editingUser.email}</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              {editError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium">
                  {editError}
                </div>
              )}

              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  placeholder="Nama Pengguna"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none font-medium"
                />
              </div>

              {/* Dropdown Role dengan pilihan Role Bawaan + Role Baru */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Hak Akses / Role
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRoleModal(true);
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Tambah Role Baru
                  </button>
                </div>

                <select
                  value={editForm.role}
                  onChange={(e) => handleFormRoleChange(e.target.value, false)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none cursor-pointer"
                >
                  <optgroup label="Role Sistem Bawaan">
                    {ROLE_PRESETS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </optgroup>

                  {rolesList.some((r) => !r.isSystem) && (
                    <optgroup label="Role Kustom Buatan Admin">
                      {rolesList
                        .filter((r) => !r.isSystem)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Memilih role akan otomatis menyesuaikan checklist menu default di bawah ini.
                </p>
              </div>

              {/* Penugasan Tim Teknisi */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <HardHat className="w-3.5 h-3.5 text-amber-500" />
                    Penugasan Tim Lapangan
                  </span>
                  {editForm.role === "teknisi" && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Wajib untuk Teknisi
                    </span>
                  )}
                </label>
                <select
                  value={editForm.tim || ""}
                  onChange={(e) => setEditForm({ ...editForm, tim: e.target.value })}
                  className={`w-full px-3.5 py-2.5 bg-gray-50 border rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none cursor-pointer ${
                    editForm.role === "teknisi" && !editForm.tim ? "border-amber-400 bg-amber-50/20" : "border-gray-200"
                  }`}
                >
                  <option value="">-- Tidak Ditugaskan / Bukan Teknisi --</option>
                  {teamList.map((t) => (
                    <option key={t.id || t.nama} value={t.nama}>
                      Regu Lapangan: {t.nama}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  {editForm.role === "teknisi"
                    ? "Tugas pada Portal Teknisi akun ini akan otomatis terkunci hanya untuk tim ini."
                    : "Opsional. Pilih tim jika pengguna ini bertugas sebagai personel regu lapangan."}
                </p>
              </div>

              {/* CHECKLIST AKSES KE MENU APA AJA */}
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-900">
                      Checklist Akses ke Menu
                    </label>
                    <p className="text-[11px] text-gray-500">
                      Centang menu mana saja yang boleh dibuka oleh user ini
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleResetToRoleDefault(false)}
                      className="text-[11px] font-bold text-gray-500 hover:text-gray-800 cursor-pointer"
                    >
                      Reset Default Role
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleSelectAllMenus(false)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {SYSTEM_MENUS.map((menu) => {
                    const IconComp = MENU_ICONS[menu.iconName] || LayoutDashboard;
                    const isChecked = editForm.role === "admin" || (editForm.allowed_menus || []).includes(menu.path);
                    const isDisabled = editForm.role === "admin" || (menu.adminOnly && editForm.role !== "admin");

                    return (
                      <label
                        key={menu.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all ${
                          isChecked
                            ? "border-emerald-400 bg-emerald-50/40 ring-1 ring-emerald-200"
                            : "border-gray-200 bg-gray-50/50 text-gray-500"
                        } ${isDisabled ? "opacity-75 cursor-not-allowed" : "cursor-pointer hover:bg-white"}`}
                      >
                        <input
                          type="checkbox"
                          disabled={isDisabled}
                          checked={isChecked}
                          onChange={() => handleMenuToggle(menu.path, false)}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <IconComp className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                            <span className="font-bold text-xs text-gray-900">{menu.label}</span>
                            {menu.adminOnly && (
                              <span className="px-1 py-0.2 rounded text-[8px] font-black bg-rose-100 text-rose-700">
                                Admin
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                            {menu.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 text-xs font-semibold bg-[#0D1B4A] hover:bg-[#1a237e] text-white rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: TAMBAH USER BARU DENGAN CHECKLIST AKSES MENU   */}
      {/* ======================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-5 sm:p-7 border border-gray-100 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Tambah Akun Baru</h3>
                <p className="text-xs text-gray-500 mt-0.5">Daftarkan akun pengguna baru dan tentukan izin menu</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="mt-4 space-y-4">
              {addError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium">
                  {addError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={addForm.full_name}
                    onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                    placeholder="Contoh: Budi Teknisi"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Email Login
                  </label>
                  <input
                    type="email"
                    required
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="teknisi@nexus.net"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Password Sementara
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none"
                />
              </div>

              {/* Dropdown Role */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                    Pilih Role / Jabatan
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowRoleModal(true)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Tambah Role Baru
                  </button>
                </div>

                <select
                  value={addForm.role}
                  onChange={(e) => handleFormRoleChange(e.target.value, true)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none cursor-pointer"
                >
                  <optgroup label="Role Sistem Bawaan">
                    {ROLE_PRESETS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </optgroup>

                  {rolesList.some((r) => !r.isSystem) && (
                    <optgroup label="Role Kustom Buatan Admin">
                      {rolesList
                        .filter((r) => !r.isSystem)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Penugasan Tim Teknisi (Tambah Akun) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <HardHat className="w-3.5 h-3.5 text-amber-500" />
                    Penugasan Tim Lapangan
                  </span>
                  {addForm.role === "teknisi" && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Wajib untuk Teknisi
                    </span>
                  )}
                </label>
                <select
                  value={addForm.tim || ""}
                  onChange={(e) => setAddForm({ ...addForm, tim: e.target.value })}
                  className={`w-full px-3.5 py-2.5 bg-gray-50 border rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none cursor-pointer ${
                    addForm.role === "teknisi" && !addForm.tim ? "border-amber-400 bg-amber-50/20" : "border-gray-200"
                  }`}
                >
                  <option value="">-- Tidak Ditugaskan / Bukan Teknisi --</option>
                  {teamList.map((t) => (
                    <option key={t.id || t.nama} value={t.nama}>
                      Regu Lapangan: {t.nama}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  {addForm.role === "teknisi"
                    ? "Tugas pada Portal Teknisi akun ini akan otomatis terkunci hanya untuk tim ini."
                    : "Opsional. Pilih tim jika akun ini bertugas sebagai personel lapangan."}
                </p>
              </div>

              {/* CHECKLIST AKSES KE MENU APA AJA */}
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-900">
                      Checklist Akses ke Menu
                    </label>
                    <p className="text-[11px] text-gray-500">
                      Tentukan modul mana saja yang dapat dibuka oleh akun baru ini
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleResetToRoleDefault(true)}
                      className="text-[11px] font-bold text-gray-500 hover:text-gray-800 cursor-pointer"
                    >
                      Reset Default Role
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleSelectAllMenus(true)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {SYSTEM_MENUS.map((menu) => {
                    const IconComp = MENU_ICONS[menu.iconName] || LayoutDashboard;
                    const isChecked = addForm.role === "admin" || (addForm.allowed_menus || []).includes(menu.path);
                    const isDisabled = addForm.role === "admin" || (menu.adminOnly && addForm.role !== "admin");

                    return (
                      <label
                        key={menu.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all ${
                          isChecked
                            ? "border-emerald-400 bg-emerald-50/40 ring-1 ring-emerald-200"
                            : "border-gray-200 bg-gray-50/50 text-gray-500"
                        } ${isDisabled ? "opacity-75 cursor-not-allowed" : "cursor-pointer hover:bg-white"}`}
                      >
                        <input
                          type="checkbox"
                          disabled={isDisabled}
                          checked={isChecked}
                          onChange={() => handleMenuToggle(menu.path, true)}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <IconComp className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                            <span className="font-bold text-xs text-gray-900">{menu.label}</span>
                            {menu.adminOnly && (
                              <span className="px-1 py-0.2 rounded text-[8px] font-black bg-rose-100 text-rose-700">
                                Admin
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                            {menu.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingAdd}
                  className="px-5 py-2.5 text-xs font-semibold bg-[#F59E0B] hover:bg-[#d97706] text-white rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingAdd ? "Menyimpan..." : "Simpan Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: FITUR UNTUK MENAMBAHKAN ROLE BARU               */}
      {/* ======================================================== */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-5 sm:p-7 border border-gray-100 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Tambah Role / Jabatan Baru</h3>
                  <p className="text-xs text-gray-500">Definisikan role baru dan tentukan checklist menu defaultnya</p>
                </div>
              </div>
              <button
                onClick={() => setShowRoleModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="mt-4 space-y-4">
              {roleError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium">
                  {roleError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Nama Role / Jabatan Baru
                </label>
                <input
                  type="text"
                  required
                  value={newRoleForm.label}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, label: e.target.value })}
                  placeholder="Contoh: Koordinator Lapangan, Admin Billing, NOC"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Deskripsi Tugas
                </label>
                <input
                  type="text"
                  value={newRoleForm.description}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                  placeholder="Contoh: Mengatur pembagian tiket dan koordinasi tiang ODP"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Warna Tag Badge */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Pilihan Warna Badge Role
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_OPTIONS.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setNewRoleForm({ ...newRoleForm, color: col.id })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        newRoleForm.color === col.id
                          ? "ring-2 ring-indigo-600 border-indigo-600 scale-105"
                          : "border-gray-200 opacity-70 hover:opacity-100"
                      } ${col.colorClass}`}
                    >
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CHECKLIST AKSES KE MENU APA AJA UNTUK ROLE BARU INI */}
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-900">
                      Checklist Akses Menu untuk Role Ini
                    </label>
                    <p className="text-[11px] text-gray-500">
                      Pilih menu apa saja yang otomatis diizinkan untuk role ini
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewRoleForm((prev) => ({
                        ...prev,
                        menus: SYSTEM_MENUS.filter((m) => !m.adminOnly).map((m) => m.path),
                      }));
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {SYSTEM_MENUS.filter((m) => !m.adminOnly).map((menu) => {
                    const IconComp = MENU_ICONS[menu.iconName] || LayoutDashboard;
                    const isChecked = (newRoleForm.menus || []).includes(menu.path);

                    return (
                      <label
                        key={menu.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? "border-indigo-400 bg-indigo-50/40 ring-1 ring-indigo-200"
                            : "border-gray-200 bg-gray-50/50 text-gray-500"
                        } hover:bg-white`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleNewRoleMenu(menu.path)}
                          className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <IconComp className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                            <span className="font-bold text-xs text-gray-900">{menu.label}</span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                            {menu.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Daftar Role Kustom yang Sudah Ada */}
              {rolesList.some((r) => !r.isSystem) && (
                <div className="pt-3 border-t border-gray-100">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Role Kustom yang Telah Dibuat
                  </label>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {rolesList
                      .filter((r) => !r.isSystem)
                      .map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${r.colorClass}`}>
                              {r.label}
                            </span>
                            <span className="text-gray-500 text-[11px]">
                              ({(r.defaultMenus || r.menus || []).length} Menu)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteRole(r.id)}
                            className="text-gray-400 hover:text-rose-600 p-1"
                            title="Hapus Role Kustom"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2.5 justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Simpan Role Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: SCRIPT SQL SUPABASE CLOUD                       */}
      {/* ======================================================== */}
      {showSqlModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-5 sm:p-6 border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Script SQL Supabase Cloud</h3>
                  <p className="text-xs text-gray-500">Sinkronisasi kolom role & allowed_menus</p>
                </div>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-gray-600">
              <p>
                Aplikasi otomatis menyimpan role & hak akses ke cache lokal browser. Untuk sinkronisasi cloud antar perangkat di database Supabase:
              </p>

              <ol className="list-decimal list-inside space-y-1 text-gray-700 font-medium bg-gray-50 p-3 rounded-xl border border-gray-100">
                <li>Buka Dashboard Supabase Anda</li>
                <li>Pilih menu <strong>SQL Editor</strong> di sisi kiri</li>
                <li>Klik <strong>New Query</strong>, paste script di bawah, lalu klik <strong>Run</strong></li>
              </ol>

              <div className="relative">
                <pre className="p-3.5 bg-gray-900 text-gray-100 rounded-2xl text-[11px] font-mono overflow-x-auto leading-relaxed border border-gray-800">
                  {sqlMigrationContent}
                </pre>
                <button
                  type="button"
                  onClick={copySqlToClipboard}
                  className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-3 py-1.5 bg-[#F59E0B] hover:bg-[#d97706] text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  {copiedSql ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? "Disalin!" : "Salin SQL"}</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100 mt-4">
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: KONFIRMASI HAPUS USER                           */}
      {/* ======================================================== */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-gray-100 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Hapus Akun Pengguna?</h3>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun <strong>{deletingUser.full_name || deletingUser.email}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-2.5 justify-center mt-5">
              <button
                onClick={() => setDeletingUser(null)}
                disabled={deletingLoading}
                className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={confirmDeleteUser}
                disabled={deletingLoading}
                className="px-5 py-2.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {deletingLoading ? "Menghapus..." : "Ya, Hapus Akun"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
