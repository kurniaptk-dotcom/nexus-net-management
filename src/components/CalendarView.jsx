import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const jenisColors = {
  PEMASANGAN: { bg: "bg-blue-500", text: "text-blue-700", light: "bg-blue-100", border: "border-blue-300" },
  PERBAIKAN: { bg: "bg-orange-500", text: "text-orange-700", light: "bg-orange-100", border: "border-orange-300" },
  PEMUTUSAN: { bg: "bg-red-500", text: "text-red-700", light: "bg-red-100", border: "border-red-300" },
  "PERBAIKAN KHUSUS (ODP/ODC)": { bg: "bg-purple-500", text: "text-purple-700", light: "bg-purple-100", border: "border-purple-300" },
};

const statusDot = {
  "WAITING LIST": "bg-amber-400",
  DIJADWALKAN: "bg-blue-400",
  SELESAI: "bg-emerald-400",
};

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarView({ data }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDate(null);
  };

  // Map pekerjaan by date
  const pekerjaanByDate = useMemo(() => {
    const map = {};
    data.forEach((item) => {
      if (!map[item.tanggal]) map[item.tanggal] = [];
      map[item.tanggal].push(item);
    });
    return map;
  }, [data]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days = [];
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push({ empty: true, key: `empty-${i}` });
    }
    // Actual days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const pekerjaan = pekerjaanByDate[dateStr] || [];
      const isToday = d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
      const isSelected = selectedDate === dateStr;
      days.push({ day: d, dateStr, pekerjaan, isToday, isSelected, key: dateStr });
    }
    return days;
  }, [daysInMonth, firstDay, currentYear, currentMonth, pekerjaanByDate, selectedDate, today]);

  // Stats for current month
  const monthStats = useMemo(() => {
    const items = data.filter((item) => {
      const d = new Date(item.tanggal);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    return {
      total: items.length,
      selesai: items.filter((i) => i.status === "SELESAI").length,
      waiting: items.filter((i) => i.status === "WAITING LIST").length,
      dijadwalkan: items.filter((i) => i.status === "DIJADWALKAN").length,
    };
  }, [data, currentMonth, currentYear]);

  // Selected date details
  const selectedItems = selectedDate ? pekerjaanByDate[selectedDate] || [] : [];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Calendar Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0D1B4A] flex items-center justify-center">
              <CalendarIcon className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800">
                {MONTHS[currentMonth]} {currentYear}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {monthStats.total} pekerjaan bulan ini
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold transition-colors"
            >
              Hari Ini
            </button>
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Month Stats */}
        <div className="px-5 py-3 border-b border-gray-100 flex gap-4 overflow-x-auto">
          {[
            { label: "Total", value: monthStats.total, color: "text-gray-900" },
            { label: "Selesai", value: monthStats.selesai, color: "text-emerald-600" },
            { label: "Dijadwalkan", value: monthStats.dijadwalkan, color: "text-blue-600" },
            { label: "Waiting", value: monthStats.waiting, color: "text-amber-600" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 font-medium uppercase">{s.label}</span>
              <span className={`text-sm font-extrabold ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAYS.map((day) => (
            <div key={day} className="px-2 py-2.5 text-center">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{day}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((cell) => {
            if (cell.empty) {
              return <div key={cell.key} className="min-h-[80px] border-b border-r border-gray-50 bg-gray-50/30" />;
            }

            const maxVisible = 3;
            const visibleItems = cell.pekerjaan.slice(0, maxVisible);
            const overflow = cell.pekerjaan.length - maxVisible;

            return (
              <div
                key={cell.key}
                onClick={() => setSelectedDate(cell.dateStr)}
                className={`min-h-[80px] border-b border-r border-gray-50 p-1.5 cursor-pointer transition-all hover:bg-gray-50/80 ${
                  cell.isSelected ? "bg-blue-50/50 ring-1 ring-inset ring-blue-200" : ""
                }`}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                      cell.isToday
                        ? "bg-[#F59E0B] text-white"
                        : cell.pekerjaan.length > 0
                        ? "text-gray-800"
                        : "text-gray-400"
                    }`}
                  >
                    {cell.day}
                  </span>
                  {cell.pekerjaan.length > 0 && (
                    <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {cell.pekerjaan.length}
                    </span>
                  )}
                </div>

                {/* Pekerjaan Items */}
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const jc = jenisColors[item.jenis] || jenisColors.PEMASANGAN;
                    return (
                      <div
                        key={item.id}
                        className={`px-1 py-0.5 rounded text-[8px] font-semibold truncate ${jc.light} ${jc.text} border ${jc.border}`}
                        title={`${item.jenis} - ${item.pelanggan} (${item.tim})`}
                      >
                        <div className="flex items-center gap-0.5">
                          <span className={`w-1 h-1 rounded-full flex-shrink-0 ${statusDot[item.status] || "bg-gray-300"}`} />
                          <span className="truncate">{item.pelanggan}</span>
                        </div>
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <div className="text-[8px] text-gray-400 font-medium px-1">
                      +{overflow} lagi
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Detail Panel */}
      {selectedDate && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-800">
                {new Date(selectedDate).toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedItems.length} pekerjaan
              </p>
            </div>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
            >
              Tutup
            </button>
          </div>
          {selectedItems.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Tidak ada pekerjaan di tanggal ini</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {selectedItems.map((item) => {
                const jc = jenisColors[item.jenis] || jenisColors.PEMASANGAN;
                return (
                  <div key={item.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                    <div className={`w-1 h-10 rounded-full ${jc.bg}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${jc.light} ${jc.text}`}>
                          {item.jenis}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          item.status === "SELESAI" ? "bg-emerald-100 text-emerald-700"
                            : item.status === "DIJADWALKAN" ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-800 truncate">{item.pelanggan}</p>
                      <p className="text-xs text-gray-400 truncate">{item.alamat}</p>
                      {item.odp && (
                        <p className="text-[11px] font-medium text-blue-600 mt-0.5 truncate">
                          📍 {item.odp}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                      {item.tim.split(" - ")[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
