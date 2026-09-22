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
} from "lucide-react";
import Toast from "../components/Toast";

export default function ManajemenUser() {
  const { profile, signUp, deleteUser, deleteUserCompletely, updateProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // Add User Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "user",
  });
  const [addError, setAddError] = useState("");
  const [savingAdd, setSavingAdd] = useState(false);

  // Edit User Modal
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ full_name: "", role: "user" });
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Confirmation Modal
  const [deletingUser, setDeletingUser] = useState(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });

  const triggerToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  useEffect(() => {
    fetchUsers();
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

  // Filtered users
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
      await signUp(addForm.email.trim(), addForm.password, addForm.full_name.trim(), addForm.role);
      setShowAddModal(false);
      setAddForm({ email: "", password: "", full_name: "", role: "user" });
      triggerToast("User baru berhasil ditambahkan!", "success");
      await fetchUsers();
    } catch (err) {
      setAddError(err.message);
    } finally {
      setSavingAdd(false);
    }
  }

  // Handle Edit User
  function openEditModal(userItem) {
    setEditingUser(userItem);
    setEditForm({
      full_name: userItem.full_name || "",
      role: userItem.role || "user",
    });
    setEditError("");
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingUser) return;
    setEditError("");
    setSavingEdit(true);

    try {
      // Prevent current admin from revoking own admin rights
      if (editingUser.id === profile?.id && editForm.role !== "admin") {
        setEditError("Anda tidak dapat mencabut hak akses Admin dari akun Anda sendiri.");
        setSavingEdit(false);
        return;
      }

      await updateProfile(editingUser.id, {
        full_name: editForm.full_name.trim(),
        role: editForm.role,
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? { ...u, full_name: editForm.full_name.trim(), role: editForm.role }
            : u
        )
      );
      setEditingUser(null);
      triggerToast("Profil user berhasil diperbarui!", "success");
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  // Handle Toggle Role Quick Button
  async function handleToggleRole(id, currentRole) {
    if (id === profile?.id && currentRole === "admin") {
      triggerToast("Anda tidak bisa menurunkan hak akses Admin akun Anda sendiri.", "error");
      return;
    }

    const newRole = currentRole === "admin" ? "user" : "admin";
    try {
      await updateProfile(id, { role: newRole });
      setUsers(users.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
      triggerToast(
        `Role berhasil diubah menjadi ${newRole === "admin" ? "Admin" : "User Biasa"}`,
        "success"
      );
    } catch (err) {
      triggerToast("Gagal update role: " + err.message, "error");
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
            Manajemen Pengguna
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Kelola hak akses akun, status admin, dan teknisi sistem
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddModal(true);
            setAddError("");
          }}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-[#0D1B4A] to-[#1a237e] hover:from-[#132766] hover:to-[#222e96] text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-blue-950/20 hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Akun Baru</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Akun</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-1">{users.length}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-[#0D1B4A]">
            <Users className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Administrator</p>
            <p className="text-3xl font-extrabold text-[#0D1B4A] mt-1">
              {users.filter((u) => u.role === "admin").length}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-700">
            <Shield className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Operator / User</p>
            <p className="text-3xl font-extrabold text-[#F59E0B] mt-1">
              {users.filter((u) => u.role === "user").length}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-[#F59E0B]">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Cari nama atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none transition-all placeholder:text-gray-400"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "Semua Role" },
            { id: "admin", label: "Admin" },
            { id: "user", label: "User" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterRole(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterRole === tab.id
                  ? "bg-[#0D1B4A] text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
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
                  Wewenang / Role
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
                  <td colSpan={5} className="px-5 py-14 text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-gray-400">
                      <div className="w-5 h-5 border-2 border-[#0D1B4A]/20 border-t-[#0D1B4A] rounded-full animate-spin" />
                      Memuat daftar pengguna...
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-14 text-center text-gray-400">
                    <User className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium">Tidak ada data pengguna yang sesuai.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = u.id === profile?.id;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Name & Avatar */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0 ${
                              u.role === "admin"
                                ? "bg-gradient-to-br from-[#0D1B4A] to-[#20367d]"
                                : "bg-gradient-to-br from-[#F59E0B] to-[#ea580c]"
                            }`}
                          >
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

                      {/* Role Pill */}
                      <td className="px-5 py-3.5">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleRole(u.id, u.role)}
                            disabled={isSelf}
                            title={
                              isSelf
                                ? "Tidak dapat mengubah role akun sendiri"
                                : "Klik untuk switch role"
                            }
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                              u.role === "admin"
                                ? "bg-[#0D1B4A] text-white hover:bg-[#1a2e73]"
                                : "bg-amber-50 text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100"
                            } ${isSelf ? "cursor-default opacity-90" : "cursor-pointer"}`}
                          >
                            {u.role === "admin" ? (
                              <Shield className="w-3.5 h-3.5" />
                            ) : (
                              <User className="w-3.5 h-3.5" />
                            )}
                            {u.role === "admin" ? "Administrator" : "User"}
                          </button>
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
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                            title="Edit data pengguna"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {!isSelf ? (
                            <button
                              onClick={() => setDeletingUser(u)}
                              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                              title="Hapus pengguna"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <div className="w-8" />
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

      {/* Modal Tambah User */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-7 border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Tambah Akun Baru</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Daftarkan pengguna baru ke sistem Nexus Net
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="mt-5 space-y-4">
              {addError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium">
                  {addError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={addForm.full_name}
                  onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="user@nexus.net"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none"
                />
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
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Hak Akses / Role
                </label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none"
                >
                  <option value="user">User Biasa / Operator</option>
                  <option value="admin">Administrator Penuh</option>
                </select>
              </div>

              <div className="flex gap-2.5 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingAdd}
                  className="px-5 py-2.5 text-xs font-semibold bg-gradient-to-r from-[#F59E0B] to-[#F97316] hover:from-[#e08e0a] hover:to-[#e2640f] text-white rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {savingAdd ? "Menyimpan..." : "Simpan Akun"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit User */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-7 border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Profil Pengguna</h3>
                <p className="text-xs text-gray-500 mt-0.5">{editingUser.email}</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-5 space-y-4">
              {editError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Hak Akses / Role
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  disabled={editingUser.id === profile?.id}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none disabled:opacity-60"
                >
                  <option value="user">User Biasa / Operator</option>
                  <option value="admin">Administrator</option>
                </select>
                {editingUser.id === profile?.id && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    Anda tidak dapat mengubah role akun sendiri.
                  </p>
                )}
              </div>

              <div className="flex gap-2.5 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 text-xs font-semibold bg-[#0D1B4A] hover:bg-[#152a70] text-white rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {savingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus User */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900">Konfirmasi Hapus</h3>
            <p className="text-xs text-center text-gray-500 mt-2 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun{" "}
              <strong className="text-gray-900">
                {deletingUser.full_name || deletingUser.email}
              </strong>
              ? Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="flex-1 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deletingLoading}
                onClick={confirmDeleteUser}
                className="flex-1 py-2.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-600/20 transition-all disabled:opacity-50"
              >
                {deletingLoading ? "Menghapus..." : "Hapus Akun"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
