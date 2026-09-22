import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Tim from "./pages/Tim";
import Pekerjaan from "./pages/Pekerjaan";
import Leads from "./pages/Leads";
import Gangguan from "./pages/Gangguan";
import ODP from "./pages/ODP";
import Laporan from "./pages/Laporan";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="tim" element={<Tim />} />
          <Route path="pekerjaan" element={<Pekerjaan />} />
          <Route path="leads" element={<Leads />} />
          <Route path="gangguan" element={<Gangguan />} />
          <Route path="odp" element={<ODP />} />
          <Route path="laporan" element={<Laporan />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
