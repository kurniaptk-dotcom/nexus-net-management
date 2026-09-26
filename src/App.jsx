import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import InstallPWA from "./components/InstallPWA";
import ErrorBoundary from "./components/ErrorBoundary";
import { hasMenuAccess, getUserAllowedMenus } from "./lib/permissions";
import { ShieldAlert } from "lucide-react";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tim = lazy(() => import("./pages/Tim"));
const Pekerjaan = lazy(() => import("./pages/Pekerjaan"));
const Leads = lazy(() => import("./pages/Leads"));
const Gangguan = lazy(() => import("./pages/Gangguan"));
const ODP = lazy(() => import("./pages/ODP"));
const Laporan = lazy(() => import("./pages/Laporan"));
const ManajemenUser = lazy(() => import("./pages/ManajemenUser"));
const TeknisiDashboard = lazy(() => import("./pages/TeknisiDashboard"));

function PageLoading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-3 border-[#0D1B4A]/20 border-t-[#0D1B4A] rounded-full animate-spin" />
        <span className="text-xs font-medium text-gray-400">Memuat halaman...</span>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-3 border-[#0D1B4A]/20 border-t-[#0D1B4A] rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function MenuGuard({ path, children }) {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (!profile) return children;

  if (hasMenuAccess(profile, path)) {
    return children;
  }

  // Not authorized: redirect to user's first allowed menu
  const allowed = getUserAllowedMenus(profile);
  const fallback = allowed.length > 0 && allowed[0] !== path ? allowed[0] : "/";
  if (fallback !== path && hasMenuAccess(profile, fallback)) {
    return <Navigate to={fallback} replace />;
  }

  return (
    <div className="p-8 text-center bg-white rounded-3xl border border-gray-100 shadow-sm max-w-md mx-auto my-12">
      <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
        <ShieldAlert className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-gray-900">Akses Terbatas</h3>
      <p className="text-sm text-gray-500 mt-1">
        Akun Anda tidak memiliki izin untuk membuka menu ini. Silakan hubungi Administrator sistem.
      </p>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-3 border-[#0D1B4A]/20 border-t-[#0D1B4A] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<MenuGuard path="/"><Dashboard /></MenuGuard>} />
          <Route path="teknisi" element={<MenuGuard path="/teknisi"><TeknisiDashboard /></MenuGuard>} />
          <Route path="tim" element={<MenuGuard path="/tim"><Tim /></MenuGuard>} />
          <Route path="pekerjaan" element={<MenuGuard path="/pekerjaan"><Pekerjaan /></MenuGuard>} />
          <Route path="leads" element={<MenuGuard path="/leads"><Leads /></MenuGuard>} />
          <Route path="gangguan" element={<MenuGuard path="/gangguan"><Gangguan /></MenuGuard>} />
          <Route path="odp" element={<MenuGuard path="/odp"><ODP /></MenuGuard>} />
          <Route path="laporan" element={<MenuGuard path="/laporan"><Laporan /></MenuGuard>} />
          <Route path="users" element={<MenuGuard path="/users"><ManajemenUser /></MenuGuard>} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <InstallPWA />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
