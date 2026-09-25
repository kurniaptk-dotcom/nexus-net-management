import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Tim from "./pages/Tim";
import Pekerjaan from "./pages/Pekerjaan";
import Leads from "./pages/Leads";
import Gangguan from "./pages/Gangguan";
import ODP from "./pages/ODP";
import Laporan from "./pages/Laporan";
import ManajemenUser from "./pages/ManajemenUser";
import InstallPWA from "./components/InstallPWA";
import ErrorBoundary from "./components/ErrorBoundary";

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
