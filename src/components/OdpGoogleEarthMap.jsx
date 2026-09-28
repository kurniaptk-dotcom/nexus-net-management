import { useState, useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Globe,
  Layers,
  MapPin,
  Navigation,
  ExternalLink,
  Ruler,
  Crosshair,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  X,
  ChevronRight,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Cable,
  Upload,
  Building2,
  SlidersHorizontal,
} from "lucide-react";
import defaultKmlData from "../data/kmlNetworkData.json";

// Helper: Hitung jarak Haversine (dalam meter)
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export default function OdpGoogleEarthMap({
  allOdcs = [],
  odpList = [],
  onEditOdp,
  onEditOdc,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const polylinesLayerRef = useRef(null);
  const rulerLayerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Data KML (default dari Full OLT.kml yang sudah diekstrak)
  const [kmlData, setKmlData] = useState(defaultKmlData);

  // States UI
  const [mapType, setMapType] = useState("google_hybrid"); // google_hybrid, google_sat, google_streets, osm
  const [showFiberLines, setShowFiberLines] = useState(true);
  const [filterType, setFilterType] = useState("ALL"); // ALL, ODC, ODP, HEADEND
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedText, setCopiedText] = useState("");

  // Ruler state
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [rulerPoints, setRulerPoints] = useState([]);
  const [rulerDistance, setRulerDistance] = useState(0);

  // Koordinat pusat peta (Kantor Nexus Net Kubu Raya / Pontianak)
  const officeCenter = useMemo(() => {
    if (kmlData?.office?.lat && kmlData?.office?.lng) {
      return [kmlData.office.lat, kmlData.office.lng];
    }
    return [-0.101658, 109.396582];
  }, [kmlData]);

  // Definisi Tile Provider Google Earth Satelit
  const TILE_LAYERS = {
    google_hybrid: {
      url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
      options: {
        maxZoom: 22,
        attribution: "&copy; Google Earth / Google Maps Hybrid",
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
      },
    },
    google_sat: {
      url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
      options: {
        maxZoom: 22,
        attribution: "&copy; Google Earth Citra Satelit Murni",
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
      },
    },
    google_streets: {
      url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
      options: {
        maxZoom: 20,
        attribution: "&copy; Google Maps Vector",
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
      },
    },
    osm: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      options: {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      },
    },
  };

  // Inisialisasi Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: officeCenter,
      zoom: 16,
      zoomControl: false,
    });

    // Zoom control diposisikan di kanan bawah
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Layer grup
    const tileLayer = L.tileLayer(
      TILE_LAYERS[mapType].url,
      TILE_LAYERS[mapType].options
    ).addTo(map);
    const markersLayer = L.layerGroup().addTo(map);
    const polylinesLayer = L.layerGroup().addTo(map);
    const rulerLayer = L.layerGroup().addTo(map);

    tileLayerRef.current = tileLayer;
    markersLayerRef.current = markersLayer;
    polylinesLayerRef.current = polylinesLayer;
    rulerLayerRef.current = rulerLayer;
    mapInstanceRef.current = map;

    // Handle map click untuk Ruler
    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      if (isRulerActive) {
        setRulerPoints((prev) => {
          const next = [...prev, [lat, lng]];
          if (next.length >= 2) {
            const d = getDistanceMeters(
              next[next.length - 2][0],
              next[next.length - 2][1],
              lat,
              lng
            );
            setRulerDistance((dist) => dist + d);
          }
          return next;
        });
      }
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer saat mapType berubah
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    tileLayerRef.current.remove();
    const newLayer = L.tileLayer(
      TILE_LAYERS[mapType].url,
      TILE_LAYERS[mapType].options
    ).addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;
  }, [mapType]);

  // Render Real KML Markers & Fiber Optic Cable Routes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !polylinesLayerRef.current)
      return;

    markersLayerRef.current.clearLayers();
    polylinesLayerRef.current.clearLayers();

    const points = kmlData?.points || [];
    const lines = kmlData?.lines || [];

    // Filter points
    const filteredPoints = points.filter((p) => {
      const matchType =
        filterType === "ALL" ||
        (filterType === "HEADEND" && p.type === "HEADEND") ||
        (filterType === "ODC" && p.type === "ODC") ||
        (filterType === "ODP" && (p.type === "ODP" || p.type === "SUB_ODP"));

      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase());

      return matchType && matchSearch;
    });

    // 1. Gambar Jalur Kabel Fiber Optik Asli (Real KML Cable Routes)
    if (showFiberLines) {
      lines.forEach((line) => {
        const isMainTrunk =
          line.name.toLowerCase().includes("kantor") ||
          line.name.toLowerCase().includes("odc 1 --> odc 2");

        const lineColor = isMainTrunk ? "#F59E0B" : "#10B981"; // Amber untuk Backbone, Emerald untuk Distribusi
        const lineWeight = isMainTrunk ? 4 : 2.5;

        const poly = L.polyline(line.coords, {
          color: lineColor,
          weight: lineWeight,
          opacity: 0.85,
          dashArray: isMainTrunk ? null : "6, 6",
          lineCap: "round",
          lineJoin: "round",
        });

        // Hitung total panjang rute kabel
        let totalMeters = 0;
        for (let i = 1; i < line.coords.length; i++) {
          totalMeters += getDistanceMeters(
            line.coords[i - 1][0],
            line.coords[i - 1][1],
            line.coords[i][0],
            line.coords[i][1]
          );
        }

        poly.bindTooltip(
          `<b>${line.name}</b><br/><span style="color:#F59E0B">Panjang Kabel: ${totalMeters} meter</span>`,
          { sticky: true, className: "fiber-tooltip" }
        );

        polylinesLayerRef.current.addLayer(poly);
      });
    }

    // 2. Gambar Marker Titik Jaringan Asli (Headend, ODC, ODP)
    filteredPoints.forEach((point) => {
      const coord = [point.lat, point.lng];
      let html = "";
      let iconSize = [32, 32];
      let iconAnchor = [16, 16];

      if (point.type === "HEADEND") {
        // Kantor Pusat
        html = `
          <div class="relative group cursor-pointer animate-bounce">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 flex items-center justify-center shadow-2xl border-2 border-white ring-4 ring-amber-400/40">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
              </svg>
            </div>
            <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/90 text-yellow-300 text-[10px] font-black px-2 py-0.5 rounded shadow pointer-events-none border border-yellow-400/50">
              HQ NEXUS NET
            </div>
          </div>
        `;
        iconSize = [40, 40];
        iconAnchor = [20, 20];
      } else if (point.type === "ODC") {
        // ODC Induk
        html = `
          <div class="relative group cursor-pointer transition-transform hover:scale-125">
            <div class="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#0D1B4A] to-blue-700 text-amber-300 flex items-center justify-center shadow-xl border-2 border-amber-400">
              <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
            </div>
            <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-900/90 text-white text-[9px] font-bold px-1.5 py-0.2 rounded shadow pointer-events-none">
              ${point.name}
            </div>
          </div>
        `;
        iconSize = [36, 36];
        iconAnchor = [18, 18];
      } else {
        // ODP / Sub-ODP
        const isSub = point.type === "SUB_ODP";
        const pinBg = isSub ? "bg-teal-500" : "bg-emerald-500";
        html = `
          <div class="relative group cursor-pointer transition-transform hover:scale-130">
            <div class="w-6 h-6 rounded-xl ${pinBg} text-white flex items-center justify-center shadow-lg border-2 border-white">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.393 9.393c5.857-5.857 15.355-5.857 21.213 0"></path>
              </svg>
            </div>
          </div>
        `;
        iconSize = [24, 24];
        iconAnchor = [12, 12];
      }

      const markerIcon = L.divIcon({
        html,
        className: "custom-kml-marker",
        iconSize,
        iconAnchor,
      });

      const marker = L.marker(coord, { icon: markerIcon });
      marker.on("click", () => {
        setSelectedNode(point);
      });

      markersLayerRef.current.addLayer(marker);
    });
  }, [kmlData, showFiberLines, filterType, searchQuery]);

  // Update visual garis ruler
  useEffect(() => {
    if (!rulerLayerRef.current) return;
    rulerLayerRef.current.clearLayers();

    if (rulerPoints.length > 0) {
      rulerPoints.forEach((pt) => {
        const marker = L.circleMarker(pt, {
          radius: 5,
          color: "#EF4444",
          fillColor: "#fff",
          fillOpacity: 1,
          weight: 2,
        });
        rulerLayerRef.current.addLayer(marker);
      });

      if (rulerPoints.length >= 2) {
        const line = L.polyline(rulerPoints, {
          color: "#EF4444",
          weight: 3,
          dashArray: "4, 4",
        });
        rulerLayerRef.current.addLayer(line);
      }
    }
  }, [rulerPoints]);

  // Terbang ke koordinat (FlyTo)
  const flyToNode = (node) => {
    if (!mapInstanceRef.current || !node.lat || !node.lng) return;
    mapInstanceRef.current.flyTo([node.lat, node.lng], 18, { duration: 1.2 });
    setSelectedNode(node);
  };

  // Reset View ke Kantor Nexus Net
  const handleResetView = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo(officeCenter, 16, { duration: 1 });
    setSelectedNode(null);
  };

  // Ambil lokasi GPS perangkat saat ini
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Browser tidak mendukung geolokasi GPS.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo(coords, 18);
          L.circleMarker(coords, {
            radius: 9,
            color: "#3B82F4",
            fillColor: "#60A5FA",
            fillOpacity: 0.9,
            weight: 3,
          })
            .addTo(mapInstanceRef.current)
            .bindPopup("<b>📍 Posisi Teknisi / Anda Saat Ini</b>")
            .openPopup();
        }
      },
      (err) => {
        alert("Gagal membaca GPS: " + err.message);
      },
      { enableHighAccuracy: true }
    );
  };

  // Handle Upload File KML Baru dari Google Earth Pro
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (!text || typeof text !== "string") return;

        const placemarkRegex = /<Placemark[\s\S]*?<\/Placemark>/g;
        const matches = text.match(placemarkRegex) || [];

        const points = [];
        const lines = [];

        matches.forEach((p) => {
          const nameMatch = p.match(/<name>(.*?)<\/name>/);
          const name = nameMatch
            ? nameMatch[1].replace(/&gt;/g, ">").replace(/&lt;/g, "<").trim()
            : "Unnamed";

          const pointMatch = p.match(/<Point>[\s\S]*?<coordinates>\s*([^\s<]+)\s*<\/coordinates>/);
          if (pointMatch) {
            const [lng, lat, alt] = pointMatch[1].split(",").map(Number);
            if (!isNaN(lat) && !isNaN(lng)) {
              let type = "ODP";
              if (name.toUpperCase().includes("KANTOR")) type = "HEADEND";
              else if (name.toUpperCase().startsWith("ODC") || name.toUpperCase().includes(" ODC"))
                type = "ODC";
              else if (name.toUpperCase().includes("SUB ODP")) type = "SUB_ODP";

              points.push({
                id: "kml-pt-" + points.length,
                name,
                type,
                lat: Number(lat.toFixed(7)),
                lng: Number(lng.toFixed(7)),
                alt: Math.round(alt || 0),
              });
            }
          }

          const lineMatch = p.match(/<LineString>[\s\S]*?<coordinates>\s*([\s\S]*?)\s*<\/coordinates>/);
          if (lineMatch) {
            const rawCoords = lineMatch[1].trim().split(/\s+/);
            const coords = [];
            rawCoords.forEach((c) => {
              const parts = c.split(",").map(Number);
              if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                coords.push([Number(parts[1].toFixed(7)), Number(parts[0].toFixed(7))]);
              }
            });
            if (coords.length > 0) {
              lines.push({
                id: "kml-line-" + lines.length,
                name,
                coords,
              });
            }
          }
        });

        if (points.length > 0 || lines.length > 0) {
          const parsed = {
            office: points.find((p) => p.type === "HEADEND") || points[0],
            totalPoints: points.length,
            totalLines: lines.length,
            points,
            lines,
          };
          setKmlData(parsed);
          alert(`Sukses memuat KML: ${points.length} Titik dan ${lines.length} Jalur Kabel!`);
          if (points[0] && mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([points[0].lat, points[0].lng], 16);
          }
        } else {
          alert("File KML tidak berisi titik koordinat yang valid.");
        }
      } catch (err) {
        alert("Gagal membaca file KML: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Salin Teks
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(""), 2500);
  };

  return (
    <div
      className={`relative w-full rounded-3xl overflow-hidden border border-gray-200/80 shadow-2xl bg-gray-950 transition-all ${
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none border-none h-screen"
          : "h-[680px] sm:h-[760px]"
      }`}
    >
      {/* 1. Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* 2. Top Header Floating Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Layer & Mode Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-900/90 backdrop-blur-md rounded-2xl border border-gray-700/80 shadow-xl pointer-events-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-white text-xs font-black tracking-wide border-r border-gray-700">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Google Earth GIS</span>
          </div>

          <button
            onClick={() => setMapType("google_hybrid")}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mapType === "google_hybrid"
                ? "bg-emerald-600 text-white shadow"
                : "text-gray-300 hover:text-white hover:bg-gray-800"
            }`}
          >
            Hybrid (Label)
          </button>
          <button
            onClick={() => setMapType("google_sat")}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mapType === "google_sat"
                ? "bg-emerald-600 text-white shadow"
                : "text-gray-300 hover:text-white hover:bg-gray-800"
            }`}
          >
            Satelit Murni
          </button>
          <button
            onClick={() => setMapType("google_streets")}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer hidden md:inline-block ${
              mapType === "google_streets"
                ? "bg-emerald-600 text-white shadow"
                : "text-gray-300 hover:text-white hover:bg-gray-800"
            }`}
          >
            Jalan
          </button>
        </div>

        {/* Action Tools: Fiber Toggle, Ruler, KML Upload, GPS, Fullscreen */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-900/90 backdrop-blur-md rounded-2xl border border-gray-700/80 shadow-xl pointer-events-auto">
          {/* Fiber line toggle */}
          <button
            onClick={() => setShowFiberLines((prev) => !prev)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              showFiberLines
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : "text-gray-400 hover:text-gray-200"
            }`}
            title="Tampilkan / Sembunyikan 195 Jalur Kabel Fiber Optik"
          >
            <Cable className="w-3.5 h-3.5" />
            <span className="hidden md:inline">195 Jalur Fiber</span>
          </button>

          {/* Ruler Distance Tool */}
          <button
            onClick={() => {
              if (isRulerActive) {
                setIsRulerActive(false);
                setRulerPoints([]);
                setRulerDistance(0);
              } else {
                setIsRulerActive(true);
              }
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isRulerActive
                ? "bg-rose-600 text-white animate-pulse"
                : "text-gray-300 hover:text-white hover:bg-gray-800"
            }`}
            title="Ukur Jarak Tarikan Kabel (Klik 2 titik di peta)"
          >
            <Ruler className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isRulerActive ? "Batal Ukur" : "Ukur Kabel"}
            </span>
          </button>

          {/* Upload File KML Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".kml"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl transition-all cursor-pointer"
            title="Unggah File KML dari Google Earth Pro"
          >
            <Upload className="w-4 h-4 text-amber-400" />
          </button>

          {/* GPS Button */}
          <button
            onClick={handleLocateMe}
            className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl transition-all cursor-pointer"
            title="Lokasi GPS Saya"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          {/* Reset Zoom */}
          <button
            onClick={handleResetView}
            className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl transition-all cursor-pointer"
            title="Reset Peta ke Kantor Nexus Net"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl transition-all cursor-pointer"
            title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3. Ruler Banner Indicator (Saat Mengukur Jarak Kabel) */}
      {isRulerActive && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-rose-600/95 text-white backdrop-blur-md rounded-2xl shadow-2xl border border-rose-400 flex items-center gap-3">
          <Ruler className="w-4 h-4 text-rose-200 animate-bounce" />
          <div className="text-xs">
            <p className="font-bold">Mode Ukur Kabel Aktif: Klik titik tiang & tujuan di peta</p>
            {rulerDistance > 0 && (
              <p className="font-black text-sm text-yellow-300">
                Estimasi Panjang Kabel: {rulerDistance} Meter ({Math.round(rulerDistance * 1.1)}m dengan kendur)
              </p>
            )}
          </div>
          <button
            onClick={() => {
              setRulerPoints([]);
              setRulerDistance(0);
            }}
            className="px-2 py-0.5 bg-black/30 hover:bg-black/50 text-[11px] font-bold rounded-lg cursor-pointer"
          >
            Reset Titik
          </button>
        </div>
      )}

      {/* 4. Floating Legend & Quick Stats */}
      <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-2 p-2 bg-gray-900/90 backdrop-blur-md rounded-2xl border border-gray-700/80 shadow-xl text-white text-xs">
        <div className="flex items-center gap-1.5 px-1.5">
          <div className="w-3 h-3 rounded-md bg-amber-400 text-slate-900 flex items-center justify-center text-[8px] font-black">
            HQ
          </div>
          <span className="font-semibold text-[11px]">Kantor Nexus</span>
        </div>
        <div className="flex items-center gap-1.5 px-1.5">
          <div className="w-3 h-3 rounded-lg bg-blue-700 border border-amber-400" />
          <span className="font-semibold text-[11px]">ODC Induk</span>
        </div>
        <div className="flex items-center gap-1.5 px-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="font-semibold text-[11px]">ODP ({kmlData?.totalPoints || 0})</span>
        </div>
        <div className="flex items-center gap-1.5 px-1.5">
          <div className="w-4 border-t-2 border-dashed border-emerald-400" />
          <span className="font-semibold text-[11px]">Jalur Kabel ({kmlData?.totalLines || 0})</span>
        </div>
      </div>

      {/* 5. Detail Popup Card (Saat Node Diklik) */}
      {selectedNode && (
        <div className="absolute top-16 right-3 z-20 w-80 sm:w-88 bg-gray-900/95 backdrop-blur-xl border border-gray-700/80 rounded-3xl p-4 text-white shadow-2xl animate-in fade-in slide-in-from-right-4 duration-200">
          <div className="flex items-start justify-between gap-2 border-b border-gray-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black ${
                  selectedNode.type === "HEADEND"
                    ? "bg-amber-400 text-slate-950 ring-2 ring-white"
                    : selectedNode.type === "ODC"
                    ? "bg-gradient-to-tr from-blue-700 to-indigo-600 text-amber-300"
                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                }`}
              >
                {selectedNode.type === "HEADEND" ? (
                  <Building2 className="w-5 h-5" />
                ) : selectedNode.type === "ODC" ? (
                  <Layers className="w-5 h-5" />
                ) : (
                  <MapPin className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 uppercase tracking-wider">
                    {selectedNode.type}
                  </span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-slate-900">
                    AKTIF GIS
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-white mt-0.5">{selectedNode.name}</h3>
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 text-gray-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-3 space-y-2 text-xs">
            <div className="flex justify-between items-center text-gray-400">
              <span>Sumber Data:</span>
              <span className="font-bold text-amber-400">Google Earth Pro (Full OLT)</span>
            </div>
            <div className="flex justify-between items-center text-gray-400">
              <span>Elevasi Ketinggian:</span>
              <span className="font-bold text-gray-200">{selectedNode.alt || 0} mdpl</span>
            </div>

            {/* Koordinat GPS */}
            <div className="mt-2 p-2 rounded-xl bg-gray-800/80 border border-gray-700/60 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-400 font-mono">Koordinat GPS:</p>
                <p className="text-xs font-mono font-bold text-emerald-400">
                  {selectedNode.lat}, {selectedNode.lng}
                </p>
              </div>
              <button
                onClick={() =>
                  copyToClipboard(`${selectedNode.lat}, ${selectedNode.lng}`)
                }
                className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 hover:text-white transition-all cursor-pointer"
                title="Salin Koordinat"
              >
                {copiedText === `${selectedNode.lat}, ${selectedNode.lng}` ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Quick Action Buttons: Google Earth 3D & Navigation */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-800">
            {/* Buka di Google Earth 3D Web */}
            <a
              href={`https://earth.google.com/web/search/${selectedNode.lat},${selectedNode.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Google Earth 3D</span>
            </a>

            {/* Buka di Google Maps Navigasi */}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedNode.lat},${selectedNode.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Rute Maps</span>
            </a>
          </div>
        </div>
      )}

      {/* 6. Sidebar Navigasi Cepat Titik ODP/ODC (Collapsible) */}
      <div
        className={`absolute top-16 left-3 bottom-14 z-10 w-72 bg-gray-900/90 backdrop-blur-xl border border-gray-700/80 rounded-3xl p-3 flex flex-col shadow-2xl transition-all duration-300 ${
          isSidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-80 opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between pb-2 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <div>
              <h4 className="text-xs font-bold text-white">Titik Sebaran Google Earth</h4>
              <p className="text-[10px] text-gray-400">
                {kmlData?.totalPoints || 0} Titik · {kmlData?.totalLines || 0} Jalur Kabel
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 text-gray-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Filter & Search inside map */}
        <div className="py-2.5 space-y-2 border-b border-gray-800">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari titik ODP / ODC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 bg-gray-800/80 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex gap-1">
            {["ALL", "HEADEND", "ODC", "ODP"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  filterType === t
                    ? "bg-emerald-600 text-white shadow"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {t === "HEADEND" ? "Kantor" : t}
              </button>
            ))}
          </div>
        </div>

        {/* List of ODPs & ODCs */}
        <div className="flex-1 overflow-y-auto space-y-1 py-2 pr-1 custom-scrollbar">
          {(kmlData?.points || [])
            .filter((p) => {
              const matchType =
                filterType === "ALL" ||
                (filterType === "HEADEND" && p.type === "HEADEND") ||
                (filterType === "ODC" && p.type === "ODC") ||
                (filterType === "ODP" && (p.type === "ODP" || p.type === "SUB_ODP"));
              const matchSearch =
                !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
              return matchType && matchSearch;
            })
            .map((p) => {
              const isSelected = selectedNode?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => flyToNode(p)}
                  className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "text-gray-300 hover:bg-gray-800/80 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        p.type === "HEADEND"
                          ? "bg-amber-400"
                          : p.type === "ODC"
                          ? "bg-blue-400"
                          : "bg-emerald-400"
                      }`}
                    />
                    <span className="truncate text-[11px] font-medium">{p.name}</span>
                  </div>
                  <span className="text-[9px] text-gray-500 shrink-0 font-mono uppercase">
                    {p.type}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* Button to re-open sidebar if closed */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-16 left-3 z-10 px-3 py-2 bg-gray-900/90 backdrop-blur-md rounded-2xl border border-gray-700/80 text-white text-xs font-bold shadow-xl flex items-center gap-2 hover:bg-gray-800 transition-all cursor-pointer"
        >
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>Buka Daftar Titik ({kmlData?.totalPoints || 0})</span>
        </button>
      )}
    </div>
  );
}
