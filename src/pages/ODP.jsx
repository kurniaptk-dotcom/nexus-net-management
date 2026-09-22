import { useState } from "react";
import { Network, Wifi, WifiOff, Search, ChevronDown, ChevronRight } from "lucide-react";
import { odpOdcList } from "../data/mockData";
import { usePersistState } from "../hooks/usePersistState";

export default function ODP() {
  const [data] = usePersistState("xnet_odpodc", odpOdcList);
  const [search, setSearch] = useState("");
  const [expandedOdc, setExpandedOdc] = useState({});

  const filtered = data.filter((item) =>
    item.nama.toLowerCase().includes(search.toLowerCase()) ||
    item.odc.toLowerCase().includes(search.toLowerCase())
  );

  // Group by ODC
  const grouped = filtered.reduce((acc, item) => {
    if (!acc[item.odc]) acc[item.odc] = [];
    acc[item.odc].push(item);
    return acc;
  }, {});

  const stats = {
    total: data.length,
    aman: data.filter((d) => d.status === "Aman").length,
    diperbaiki: data.filter((d) => d.status === "Diperbaiki").length,
    kosong: data.filter((d) => !d.status).length,
    totalOdc: [...new Set(data.map((d) => d.odc))].length,
  };

  const toggleOdc = (odc) => {
    setExpandedOdc((prev) => ({ ...prev, [odc]: !prev[odc] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">ODP / ODC</h1>
        <p className="text-gray-500 text-sm mt-0.5">Monitoring ODP, ODC, dan status LOS</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total ODP", value: stats.total, bg: "bg-white", color: "text-gray-900" },
          { label: "Aman", value: stats.aman, bg: "bg-emerald-50", color: "text-emerald-600" },
          { label: "Diperbaiki", value: stats.diperbaiki, bg: "bg-amber-50", color: "text-amber-600" },
          { label: "Total ODC", value: stats.totalOdc, bg: "bg-blue-50", color: "text-blue-600" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-gray-100`}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-extrabold ${s.color} mt-1`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari ODP / ODC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#F59E0B] focus:border-transparent outline-none transition-all"
          />
        </div>
      </div>

      {/* ODP List grouped by ODC */}
      <div className="space-y-3">
        {Object.entries(grouped).map(([odc, items]) => {
          const isExpanded = expandedOdc[odc] !== false;
          const amanCount = items.filter((i) => i.status === "Aman").length;
          return (
            <div key={odc} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => toggleOdc(odc)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0D1B4A] to-[#1a237e] flex items-center justify-center">
                    <Network className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-gray-800">{odc}</h3>
                    <p className="text-xs text-gray-400">{items.length} ODP · {amanCount} Aman</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-bold">
                    {items.length}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50/80">
                      <tr>
                        <th className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">Nama ODP</th>
                        <th className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">Keterangan</th>
                        <th className="text-left px-5 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              {item.status === "Aman" ? (
                                <Wifi className="w-4 h-4 text-emerald-500" />
                              ) : item.status === "Diperbaiki" ? (
                                <WifiOff className="w-4 h-4 text-amber-500" />
                              ) : (
                                <Wifi className="w-4 h-4 text-gray-300" />
                              )}
                              <span className="font-semibold text-gray-800">{item.nama}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-gray-500">{item.keterangan || "-"}</td>
                          <td className="px-5 py-3">
                            {item.status ? (
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                item.status === "Aman" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                  : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                              }`}>
                                {item.status}
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-gray-50 text-gray-500 rounded-lg text-xs font-semibold ring-1 ring-gray-200">
                                Belum Dicek
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
