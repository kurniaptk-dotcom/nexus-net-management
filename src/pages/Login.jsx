import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { LogIn, Eye, EyeOff, Lock, Mail, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

export default function Login() {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem("nexus_remember_email") || "";
    } catch {
      return "";
    }
  });
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return Boolean(localStorage.getItem("nexus_remember_email"));
    } catch {
      return false;
    }
  });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot password modal states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const formatErrorMessage = (msg) => {
    if (!msg) return "";
    const lower = msg.toLowerCase();
    if (lower.includes("invalid login credentials")) return "Email atau password salah.";
    if (lower.includes("email not confirmed")) return "Email belum dikonfirmasi di Supabase.";
    if (lower.includes("too many requests") || lower.includes("rate limit")) {
      return "Terlalu banyak percobaan masuk. Harap tunggu beberapa saat.";
    }
    if (lower.includes("network") || lower.includes("fetch")) {
      return "Gagal terhubung ke server. Silakan periksa koneksi internet.";
    }
    return msg;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Harap isi email dan password.");
      return;
    }

    setLoading(true);
    try {
      if (rememberMe) {
        localStorage.setItem("nexus_remember_email", email.trim());
      } else {
        localStorage.removeItem("nexus_remember_email");
      }
      await signIn(email.trim(), password);
    } catch (err) {
      setError(formatErrorMessage(err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess(false);

    if (!forgotEmail.trim()) {
      setForgotError("Harap masukkan alamat email Anda.");
      return;
    }

    setForgotLoading(true);
    try {
      await resetPassword(forgotEmail.trim());
      setForgotSuccess(true);
    } catch (err) {
      setForgotError(formatErrorMessage(err.message));
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070E24] relative overflow-hidden flex items-center justify-center p-4 selection:bg-[#F59E0B]/30 selection:text-white">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center mb-6">
          <div className="w-28 h-28 flex items-center justify-center p-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-black/30 mb-3.5">
            <img
              src="/LogoNexusputihoren.png"
              alt="Nexus Net"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Nexus Net Dashboard</h1>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/40 p-7 sm:p-8 border border-white/40">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Masuk ke Akun</h2>
            <p className="text-sm text-gray-500 mt-1">
              Gunakan email & password terdaftar untuk melanjutkan
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200/80 rounded-2xl text-xs text-rose-700 font-medium flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
              <span className="flex-1 leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none transition-all placeholder:text-gray-400 text-gray-900 font-medium"
                  placeholder="admin@nexus.net"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotSuccess(false);
                    setForgotError("");
                    setShowForgotModal(true);
                  }}
                  className="text-xs font-semibold text-[#0D1B4A] hover:text-[#F59E0B] transition-colors"
                >
                  Lupa password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none transition-all placeholder:text-gray-400 text-gray-900 font-medium"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors p-1"
                  aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-600 font-medium">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#F59E0B] border-gray-300 focus:ring-[#F59E0B] cursor-pointer"
                />
                Ingat email saya
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-gradient-to-r from-[#0D1B4A] via-[#152763] to-[#0D1B4A] hover:from-[#11235c] hover:to-[#172c72] text-white font-semibold rounded-xl shadow-lg shadow-blue-950/20 hover:shadow-xl hover:shadow-blue-950/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-[#F59E0B]" />
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4 ml-1 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6">
          <p className="text-white/40 text-xs">
            &copy; 2026 Nexus Net &bull; Hak Cipta Dilindungi
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-gray-900">Reset Password</h3>
            <p className="text-xs text-gray-500 mt-1">
              Masukkan email akun Anda. Kami akan mengirimkan tautan untuk mengatur ulang password.
            </p>

            {forgotSuccess ? (
              <div className="mt-5 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                <div className="flex items-start gap-2.5 text-emerald-800 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Tautan reset terkirim!</p>
                    <p className="text-emerald-700 mt-0.5">
                      Silakan periksa kotak masuk atau folder spam email Anda.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Tutup
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="mt-5 space-y-4">
                {forgotError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                    {forgotError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Email Akun
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    placeholder="nama@nexus.net"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#F59E0B]/50 focus:border-[#F59E0B] outline-none"
                  />
                </div>
                <div className="flex gap-2.5 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-4 py-2 text-xs font-semibold bg-[#0D1B4A] hover:bg-[#182b6b] text-white rounded-xl shadow transition-colors disabled:opacity-50"
                  >
                    {forgotLoading ? "Mengirim..." : "Kirim Tautan"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
