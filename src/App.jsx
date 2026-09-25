import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import InstallPWA from "./components/InstallPWA";
import ErrorBoundary from "./components/ErrorBoundary";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Tim = lazy(() => import("./pages/Tim"));
const Pekerjaan = lazy(() => import("./pages/Pekerjaan"));
const Leads = lazy(() => import("./pages/Leads"));
const Gangguan = lazy(() => import("./pages/Gangguan"));
const ODP = lazy(() => import("./pages/ODP"));
const Laporan = lazy(() => import("./pages/Laporan"));
const ManajemenUser = lazy(() => import("./pages/ManajemenUser"));

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
          <Route index element={<Dashboard />} />
          <Route path="tim" element={<Tim />} />
          <Route path="pekerjaan" element={<Pekerjaan />} />
          <Route path="leads" element={<Leads />} />
          <Route path="gangguan" element={<Gangguan />} />
          <Route path="odp" element={<ODP />} />
          <Route path="laporan" element={<Laporan />} />
          <Route path="users" element={<ManajemenUser />} />
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
