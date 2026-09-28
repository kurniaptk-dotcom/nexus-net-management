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
  RefreshCw,
  Target,
  Home,
  Share2,
  UserPlus,
  Sparkles,
  Send,
  Compass,
  ArrowRight,
  ChevronDown,
  ChevronUp,
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
  onToggleStatus,
  focusedNode = null,
  initialCoverageMode = false,
  initialCoverageTarget = null,
  onSaveLead = null,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const polylinesLayerRef = useRef(null);
  const rulerLayerRef = useRef(null);
  const coverageLayerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Data KML (default dari Full OLT.kml yang sudah diekstrak)
  const [kmlData, setKmlData] = useState(defaultKmlData);

  // States UI
  const [mapType, setMapType] = useState("google_hybrid"); // google_hybrid, google_sat, google_streets, osm
  const [showFiberLines, setShowFiberLines] = useState(true);
  const [filterType, setFilterType] = useState("ALL"); // ALL, ODC, ODP, HEADEND
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedText, setCopiedText] = useState("");

  // Ruler state
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [rulerPoints, setRulerPoints] = useState([]);
  const [rulerDistance, setRulerDistance] = useState(0);

  // Coverage Checker State (Fitur #2: Feasibility & Distance Check)
  const [isCoverageActive, setIsCoverageActive] = useState(initialCoverageMode);
  const [coverageSearchText, setCoverageSearchText] = useState("");
  const [isSearchingCoord, setIsSearchingCoord] = useState(false);
  const [coverageResult, setCoverageResult] = useState(null);
  const [showCoveragePanel, setShowCoveragePanel] = useState(true);
  const [showAlternatives, setShowAlternatives] = useState(false);

  // Refs untuk mencegah stale closure pada event listener Leaflet
  const isRulerActiveRef = useRef(isRulerActive);
  isRulerActiveRef.current = isRulerActive;
  const isCoverageActiveRef = useRef(isCoverageActive);
  isCoverageActiveRef.current = isCoverageActive;
  const triggerCoverageAtRef = useRef(null);

  // Live Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState("");

  // Handler Sinkronisasi Realtime Langsung ke Google Earth Cloud
  const handleLiveSync = async (silent = false) => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/sync-earth?docId=1jjol-j_FNp2XN5HD9YS9x2QPbfY9-PHf");
      const json = await res.json();
      if (json.success) {
        setKmlData(json);
        const timeStr = new Date().toLocaleTimeString();
        setLastSyncTime(timeStr);
        if (!silent) {
          alert(`✅ Sinkronisasi Google Earth Berhasil!\n\nData terbaru berhasil ditarik langsung dari Cloud:\n• ${json.totalPoints} Titik Jaringan\n• ${json.totalLines} Rute Kabel Fiber Optik\nWaktu: ${timeStr}`);
        }
      } else if (json.isRestricted) {
        if (!silent) {
          alert(
            "🔒 Akses Google Earth Masih 'Restricted' (Pribadi):\n\n" +
            json.error +
            "\n\nLangkah singkat:\n1. Buka link Google Earth Anda\n2. Klik ikon 'Bagikan / Share Proyek'\n3. Ubah Akses Umum menjadi 'Siapa saja yang memiliki link (Viewer)'\n4. Klik Selesai, lalu coba tekan sinkronkan kembali."
          );
        }
      } else if (!silent) {
        alert("Gagal sinkronisasi: " + (json.error || "Terjadi kendala koneksi"));
      }
    } catch (err) {
      if (!silent) alert("Kendala koneksi ke server: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

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
    const coverageLayer = L.layerGroup().addTo(map);

    tileLayerRef.current = tileLayer;
    markersLayerRef.current = markersLayer;
    polylinesLayerRef.current = polylinesLayer;
    rulerLayerRef.current = rulerLayer;
    coverageLayerRef.current = coverageLayer;
    mapInstanceRef.current = map;

    // Handle map click untuk Coverage Checker & Ruler
    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      if (isCoverageActiveRef.current && triggerCoverageAtRef.current) {
        triggerCoverageAtRef.current(lat, lng);
      } else if (isRulerActiveRef.current) {
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
        const cleanPtName = point.name.replace(/\./g, " ").trim().toLowerCase();
        const matchedOdp = (odpList || []).find((o) => {
          const cleanOName = o.nama.replace(/\./g, " ").trim().toLowerCase();
          return cleanOName.includes(cleanPtName) || cleanPtName.includes(cleanOName.split(" - ")[0]);
        });

        const liveStatus = matchedOdp?.status || "Aman";
        const isSub = point.type === "SUB_ODP";

        let pinBg = isSub ? "bg-teal-500" : "bg-emerald-500";
        if (liveStatus === "Diperbaiki") {
          pinBg = "bg-amber-500 animate-pulse border-amber-200 ring-2 ring-amber-400";
        }

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

      const cleanPtName = point.name.replace(/\./g, " ").trim().toLowerCase();
      const matchedOdp = (odpList || []).find((o) => {
        const cleanOName = o.nama.replace(/\./g, " ").trim().toLowerCase();
        return cleanOName.includes(cleanPtName) || cleanPtName.includes(cleanOName.split(" - ")[0]);
      });

      const marker = L.marker(coord, { icon: markerIcon });
      marker.on("click", () => {
        setSelectedNode({
          ...point,
          status: matchedOdp?.status || "Aman",
          keterangan: matchedOdp?.keterangan || (point.type === "SUB_ODP" ? "Sub-ODP Distribusi" : "Tiang Distribusi Lapangan"),
          matchedOdp: matchedOdp || { ...point, status: "Aman" },
        });
      });

      markersLayerRef.current.addLayer(marker);
    });
  }, [kmlData, odpList, showFiberLines, filterType, searchQuery]);

  // Efek untuk fokus ke node dari tabel (flyTo)
  useEffect(() => {
    if (!mapInstanceRef.current || !focusedNode) return;
    const lat = focusedNode.lat || (focusedNode.coord && focusedNode.coord[0]);
    const lng = focusedNode.lng || (focusedNode.coord && focusedNode.coord[1]);
    if (lat && lng) {
      mapInstanceRef.current.flyTo([lat, lng], 19, { duration: 1.2 });
      setSelectedNode(focusedNode);
    }
  }, [focusedNode]);

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

  // === FITUR COVERAGE CHECKER (OTOMATIS CARI ODP TERDEKAT & FEASIBILITY) ===
  const calculateCoverage = (lat, lng, label = "") => {
    if (!lat || !lng) return null;
    const points = (kmlData?.points || []).filter(
      (p) => p.type === "ODP" || p.type === "SUB_ODP"
    );
    if (points.length === 0) return null;

    const withDistances = points.map((odp) => {
      const straightDist = getDistanceMeters(lat, lng, odp.lat, odp.lng);
      const estCable = Math.round(straightDist * 1.15); // +15% kendur & tiang

      const cleanPtName = odp.name.replace(/\./g, " ").trim().toLowerCase();
      const matched = (odpList || []).find((o) => {
        const cleanOName = o.nama.replace(/\./g, " ").trim().toLowerCase();
        return cleanOName.includes(cleanPtName) || cleanPtName.includes(cleanOName.split(" - ")[0]);
      });

      let tier = "OUT";
      let statusText = "Di Luar Jangkauan";
      let tierColor = "#EF4444";
      let tierBadge = "bg-rose-500 text-white";
      let tierDesc =
        "Melebihi batas aman dropcore (250m). Berisiko redaman loss tinggi. Diperlukan penambahan tiang distribusi atau pembangunan ODP baru.";

      if (straightDist <= 150) {
        tier = "IDEAL";
        statusText = "Sangat Layak (Standar)";
        tierColor = "#10B981";
        tierBadge = "bg-emerald-500 text-slate-950 font-black";
        tierDesc =
          "Jarak sangat ideal (< 150m). Redaman optik diprediksi prima (-16 s/d -20 dBm). Siap instalasi standar 1 roll dropcore.";
      } else if (straightDist <= 250) {
        tier = "SURVEY";
        statusText = "Bisa Dipasang (Perlu Survey)";
        tierColor = "#F59E0B";
        tierBadge = "bg-amber-500 text-slate-950 font-black";
        tierDesc =
          "Jarak menengah (150m - 250m). Disarankan teknisi cek ketersediaan tiang tumpu dan redaman tiang ODP sebelum penarikan kabel.";
      }

      return {
        ...odp,
        straightDist,
        estCable,
        tier,
        statusText,
        tierColor,
        tierBadge,
        tierDesc,
        matchedStatus: matched?.status || "Aman",
        matchedOdp: matched,
      };
    });

    withDistances.sort((a, b) => a.straightDist - b.straightDist);

    return {
      target: {
        lat,
        lng,
        label: label || `Titik Koordinat: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      },
      best: withDistances[0],
      alternatives: withDistances.slice(1, 4),
      allNearest: withDistances.slice(0, 5),
    };
  };

  const handleCheckCoverageAt = (lat, lng, label = "") => {
    const res = calculateCoverage(lat, lng, label);
    if (!res) return;
    setCoverageResult(res);
    setShowCoveragePanel(true);
    if (mapInstanceRef.current && res.best) {
      mapInstanceRef.current.fitBounds(
        [
          [lat, lng],
          [res.best.lat, res.best.lng],
        ],
        { padding: [70, 70], maxZoom: 18 }
      );
    }
  };

  // Selalu pasang fungsi handleCheckCoverageAt ke ref
  triggerCoverageAtRef.current = handleCheckCoverageAt;

  // Efek jika ada initialCoverageTarget dari Leads
  useEffect(() => {
    if (initialCoverageTarget && initialCoverageTarget.lat && initialCoverageTarget.lng) {
      setIsCoverageActive(true);
      handleCheckCoverageAt(
        initialCoverageTarget.lat,
        initialCoverageTarget.lng,
        initialCoverageTarget.label || ""
      );
    }
  }, [initialCoverageTarget]);

  // Efek jika initialCoverageMode aktif
  useEffect(() => {
    if (initialCoverageMode) {
      setIsCoverageActive(true);
    }
  }, [initialCoverageMode]);

  // Render Visual Garis & Pin Coverage Checker di Peta Leaflet
  useEffect(() => {
    if (!mapInstanceRef.current || !coverageLayerRef.current) return;
    coverageLayerRef.current.clearLayers();

    if (!coverageResult || !isCoverageActive) return;

    const { target, best } = coverageResult;

    // 1. Pin Target Calon Pelanggan (Animasi House Marker)
    const targetHtml = `
      <div class="relative group cursor-pointer animate-bounce">
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-rose-600 text-white flex items-center justify-center shadow-2xl border-2 border-white ring-4 ring-rose-400/50">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
          </svg>
        </div>
        <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/90 text-rose-300 text-[10px] font-black px-2 py-0.5 rounded shadow pointer-events-none border border-rose-400/60">
          🏠 CALON PELANGGAN
        </div>
      </div>
    `;

    const targetIcon = L.divIcon({
      html: targetHtml,
      className: "custom-target-marker",
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const targetMarker = L.marker([target.lat, target.lng], { icon: targetIcon });
    coverageLayerRef.current.addLayer(targetMarker);

    if (best) {
      // 2. Garis Virtual Dropcore dari Rumah ke ODP Terdekat
      const line = L.polyline(
        [
          [target.lat, target.lng],
          [best.lat, best.lng],
        ],
        {
          color: best.tierColor,
          weight: 4,
          dashArray: "6, 6",
          opacity: 0.95,
          lineCap: "round",
        }
      );

      line.bindTooltip(
        `<div style="font-family:sans-serif; text-align:center; padding: 2px;">
          <b style="font-size:12px;">📏 Jarak: ${best.straightDist} Meter</b><br/>
          <span style="color:${best.tierColor}; font-weight:bold; font-size:11px;">🔌 Est. Dropcore: ~${best.estCable} Meter</span>
        </div>`,
        { permanent: true, direction: "center", className: "coverage-line-tooltip" }
      );
      coverageLayerRef.current.addLayer(line);

      // 3. Lingkaran Radius Zona Ideal (150m) & Zona Maksimum (250m) dari ODP
      const circleIdeal = L.circle([best.lat, best.lng], {
        radius: 150,
        color: "#10B981",
        fillColor: "#10B981",
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: "4, 4",
      });
      coverageLayerRef.current.addLayer(circleIdeal);

      const circleMax = L.circle([best.lat, best.lng], {
        radius: 250,
        color: "#F59E0B",
        fillColor: "#F59E0B",
        fillOpacity: 0.04,
        weight: 1,
        dashArray: "6, 6",
      });
      coverageLayerRef.current.addLayer(circleMax);
    }
  }, [coverageResult, isCoverageActive]);

  // Handler Cari Alamat / Paste Koordinat
  const handleCoverageSearch = async (e) => {
    if (e) e.preventDefault();
    if (!coverageSearchText.trim()) return;

    const text = coverageSearchText.trim();

    // 1. Cek format koordinat: e.g. "-0.1054, 109.3980" atau "-0.1054 109.3980"
    const coordRegex = /([+-]?\d+(?:\.\d+)?)[,\s]+([+-]?\d+(?:\.\d+)?)/;
    const match = text.match(coordRegex);

    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        handleCheckCoverageAt(lat, lng, `Koordinat: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        return;
      }
    }

    // 2. Geocode nama jalan / daerah via Nominatim OpenStreetMap
    setIsSearchingCoord(true);
    try {
      const query =
        text.toLowerCase().includes("pontianak") || text.toLowerCase().includes("kubu raya")
          ? text
          : `${text}, Kubu Raya, Pontianak`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        handleCheckCoverageAt(lat, lng, data[0].display_name);
      } else {
        alert("Lokasi/alamat tidak ditemukan. Coba ketik koordinat GPS langsung atau klik lokasi rumah di peta satelit.");
      }
    } catch (err) {
      alert("Gagal mencari alamat: " + err.message);
    } finally {
      setIsSearchingCoord(false);
    }
  };

  // Handler Pakai GPS Perangkat untuk Coverage
  const handleLocateForCoverage = () => {
    if (!navigator.geolocation) {
      alert("Browser tidak mendukung geolokasi GPS.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        handleCheckCoverageAt(lat, lng, "📍 Posisi GPS Saya Saat Ini");
      },
      (err) => {
        alert("Gagal membaca GPS: " + err.message);
      },
      { enableHighAccuracy: true }
    );
  };

  // Handler Salin Pesan Format WhatsApp
  const handleCopyWhatsApp = () => {
    if (!coverageResult || !coverageResult.best) return;
    const { target, best, alternatives } = coverageResult;

    const statusEmoji = best.tier === "IDEAL" ? "🟢" : best.tier === "SURVEY" ? "🟡" : "🔴";
    const statusTitle =
      best.tier === "IDEAL"
        ? "SANGAT LAYAK (BISA LANGSUNG PASANG)"
        : best.tier === "SURVEY"
        ? "BISA DIPASANG (PERLU SURVEY TEKNISI)"
        : "DI LUAR JANGKAUAN ODP STANDAR";

    const altText =
      alternatives && alternatives.length > 0
        ? alternatives
            .map(
              (alt, idx) =>
                `${idx + 1}. *${alt.name}* (${alt.straightDist}m - est kabel ~${alt.estCable}m)`
            )
            .join("\n")
        : "-";

    const message = `📍 *HASIL SURVEY COVERAGE FTTH NEXUS NET*
━━━━━━━━━━━━━━━━━━━━━━━━
🏠 *Lokasi Target:* ${target.label || "Rumah Calon Pelanggan"}
📌 *Koordinat GPS:* ${target.lat.toFixed(6)}, ${target.lng.toFixed(6)}
⚡ *Status Feasibility:* ${statusEmoji} *${statusTitle}*

📡 *ODP Rekomendasi:* *${best.name}*
🏢 *ODC Induk:* ${best.odc || "ODC Distribusi"}
📏 *Jarak Lurus Tiang:* ${best.straightDist} Meter
🔌 *Estimasi Dropcore:* ~${best.estCable} Meter (+15% kendur & tiang)
🏷️ *Status ODP:* ${best.matchedStatus || "Aman"}

🔄 *Alternatif ODP Terdekat:*
${altText}

━━━━━━━━━━━━━━━━━━━━━━━━
📝 *Catatan Lapangan:*
${
  best.tier === "IDEAL"
    ? "✅ Jarak sangat ideal (<150m). Redaman diprediksi prima (-16 s/d -20 dBm). Siap instalasi standar 1 roll dropcore."
    : best.tier === "SURVEY"
    ? "⚠️ Jarak 150m - 250m. Membutuhkan tarikan dropcore panjang. Perlu pengecekan redaman ODP dan tiang tumpu oleh tim teknisi."
    : "❌ Jarak melebihi 250m. Melebihi batas aman dropcore standar. Perlu pengajuan tiang baru / ODP baru."
}
━━━━━━━━━━━━━━━━━━━━━━━━
🌐 *Navigasi Google Maps:*
https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}`;

    navigator.clipboard.writeText(message);
    setCopiedText("whatsapp");
    setTimeout(() => setCopiedText(""), 2500);
  };

  // Handler Simpan / Teruskan ke Leads
  const handleSaveToLead = () => {
    if (!coverageResult || !coverageResult.best) return;
    if (onSaveLead) {
      onSaveLead({
        targetPoint: coverageResult.target,
        odpName: coverageResult.best.name,
        straightDist: coverageResult.best.straightDist,
        estCable: coverageResult.best.estCable,
        tier: coverageResult.best.tier,
      });
    }
  };

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
      className={`relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-200/80 shadow-2xl bg-gray-950 transition-all ${
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none border-none h-screen"
          : "h-[540px] sm:h-[680px] lg:h-[760px]"
      }`}
    >
      {/* 1. Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* 2. Top Header Floating Bar (Mobile Friendly) */}
      <div className="absolute top-2 sm:top-3 left-2 sm:left-3 right-2 sm:right-3 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 pointer-events-none">
        {/* Layer & Mode Selector */}
        <div className="flex items-center gap-1 p-1 bg-gray-900/90 backdrop-blur-md rounded-xl sm:rounded-2xl border border-gray-700/80 shadow-xl pointer-events-auto self-start sm:self-auto overflow-x-auto max-w-full">
          <div className="flex items-center gap-1.5 px-2 py-1 text-white text-[11px] sm:text-xs font-black tracking-wide border-r border-gray-700 shrink-0">
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Google Earth GIS</span>
          </div>

          <button
            onClick={() => setMapType("google_hybrid")}
            className={`px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer shrink-0 ${
              mapType === "google_hybrid"
                ? "bg-emerald-600 text-white shadow"
                : "text-gray-300 hover:text-white hover:bg-gray-800"
            }`}
          >
            Hybrid
          </button>
          <button
            onClick={() => setMapType("google_sat")}
            className={`px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer shrink-0 ${
              mapType === "google_sat"
                ? "bg-emerald-600 text-white shadow"
                : "text-gray-300 hover:text-white hover:bg-gray-800"
            }`}
          >
            Satelit
          </button>
          <button
            onClick={() => setMapType("google_streets")}
            className={`px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer shrink-0 hidden md:inline-block ${
              mapType === "google_streets"
                ? "bg-emerald-600 text-white shadow"
                : "text-gray-300 hover:text-white hover:bg-gray-800"
            }`}
          >
            Jalan
          </button>
        </div>

        {/* Action Tools: Coverage, Fiber Toggle, Ruler, KML Upload, GPS, Fullscreen */}
        <div className="flex items-center gap-1 p-1 bg-gray-900/90 backdrop-blur-md rounded-xl sm:rounded-2xl border border-gray-700/80 shadow-xl pointer-events-auto overflow-x-auto max-w-full">
          {/* Tombol Fitur #2: Coverage Feasibility Checker */}
          <button
            onClick={() => {
              if (isCoverageActive) {
                setIsCoverageActive(false);
                setCoverageResult(null);
              } else {
                setIsCoverageActive(true);
                setIsRulerActive(false); // Matikan ruler jika coverage aktif
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer shrink-0 ${
              isCoverageActive
                ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black shadow-lg shadow-amber-500/20 ring-2 ring-white/60 animate-pulse"
                : "bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-500/40"
            }`}
            title="Cek Jangkauan ODP & Feasibility Pemasangan Pelanggan Baru (Sales/Marketing/Survey)"
          >
            <Target className={`w-3.5 h-3.5 ${isCoverageActive ? "text-slate-950" : "text-emerald-400"}`} />
            <span>{isCoverageActive ? "Coverage ON" : "Cek Coverage"}</span>
          </button>

          {/* Fiber line toggle */}
          <button
            onClick={() => setShowFiberLines((prev) => !prev)}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer shrink-0 ${
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
                setIsCoverageActive(false);
                setCoverageResult(null);
              }
            }}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer shrink-0 ${
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

          {/* Tombol Live Sync Google Earth Cloud */}
          <button
            onClick={() => handleLiveSync(false)}
            disabled={isSyncing}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer shrink-0 ${
              isSyncing
                ? "bg-amber-500 text-slate-950 animate-pulse"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow"
            }`}
            title={lastSyncTime ? `Sinkronkan dari Google Earth (Terakhir: ${lastSyncTime})` : "Sinkronkan langsung dari Google Earth Cloud"}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{isSyncing ? "Sinkron..." : "Sinkronkan Cloud"}</span>
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
            className="p-1 sm:p-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg sm:rounded-xl transition-all cursor-pointer shrink-0"
            title="Unggah File KML dari Google Earth Pro"
          >
            <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
          </button>

          {/* GPS Button */}
          <button
            onClick={handleLocateMe}
            className="p-1 sm:p-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg sm:rounded-xl transition-all cursor-pointer shrink-0"
            title="Lokasi GPS Saya"
          >
            <Crosshair className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Reset Zoom */}
          <button
            onClick={handleResetView}
            className="p-1 sm:p-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg sm:rounded-xl transition-all cursor-pointer shrink-0"
            title="Reset Peta ke Kantor Nexus Net"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-1 sm:p-1.5 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg sm:rounded-xl transition-all cursor-pointer shrink-0"
            title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>
        </div>
      </div>

      {/* 2.5 Coverage Checker Top Controls & Search Bar (Sales / Survey Mode) */}
      {isCoverageActive && (
        <div className="absolute top-24 sm:top-16 left-2 sm:left-auto right-2 sm:right-3 sm:w-110 z-20 bg-gray-900/95 backdrop-blur-xl border border-amber-500/50 rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 shadow-2xl text-white animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
                <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div>
                <h4 className="text-[11px] sm:text-xs font-extrabold text-amber-300 flex items-center gap-1.5">
                  <span>Coverage Feasibility Checker</span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[8px] sm:text-[9px] font-bold border border-amber-400/30">
                    SALES
                  </span>
                </h4>
                <p className="text-[9px] sm:text-[10px] text-gray-400">Pengecekan kelayakan jarak ODP calon pelanggan</p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsCoverageActive(false);
                setCoverageResult(null);
              }}
              className="p-1 text-gray-400 hover:text-white rounded-lg cursor-pointer"
              title="Tutup Mode Coverage"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Box / Coordinate Input */}
          <form onSubmit={handleCoverageSearch} className="mt-2.5 flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Paste koordinat (-0.1054, 109.3980) / alamat..."
                value={coverageSearchText}
                onChange={(e) => setCoverageSearchText(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 sm:py-2 bg-gray-800/90 border border-gray-700 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
              />
            </div>
            <button
              type="submit"
              disabled={isSearchingCoord}
              className="px-3 py-1.5 sm:py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer transition-all shrink-0"
            >
              {isSearchingCoord ? "..." : "Cek"}
            </button>
            <button
              type="button"
              onClick={handleLocateForCoverage}
              className="p-1.5 sm:p-2 bg-gray-800 hover:bg-gray-700 text-blue-400 hover:text-blue-300 rounded-xl border border-gray-700 cursor-pointer shrink-0"
              title="Gunakan Lokasi GPS Saya Saat Ini (Depan Rumah Pelanggan)"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-2 text-[10px] text-gray-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span>💡</span>
              <span>Klik atap rumah di peta satelit.</span>
            </span>
            {coverageResult && (
              <button
                type="button"
                onClick={() => {
                  setCoverageResult(null);
                  setCoverageSearchText("");
                }}
                className="text-rose-400 hover:text-rose-300 font-bold cursor-pointer text-[11px]"
              >
                Reset Titik
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2.6 Coverage Feasibility Result Card (Panel Hasil Analisis ODP Terdekat - Mobile Bottom Sheet Friendly) */}
      {isCoverageActive && coverageResult && coverageResult.best && (
        <div className="fixed inset-x-0 bottom-0 sm:absolute sm:inset-x-auto sm:bottom-4 sm:right-3 sm:w-110 z-40 max-h-[85vh] sm:max-h-[82vh] overflow-y-auto bg-gray-900/98 backdrop-blur-2xl border-t sm:border border-gray-700/80 rounded-t-3xl sm:rounded-3xl p-4 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-6">
          {/* Mobile Drag Handle Indicator */}
          <div className="w-12 h-1.5 bg-gray-600 rounded-full mx-auto mb-2.5 sm:hidden" />

          {/* Feasibility Header Badge */}
          <div className="flex items-start justify-between gap-3 border-b border-gray-800 pb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide ${coverageResult.best.tierBadge}`}>
                  {coverageResult.best.statusText}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {coverageResult.best.tier === "IDEAL"
                    ? "🟢 Siap Pasang"
                    : coverageResult.best.tier === "SURVEY"
                    ? "🟡 Dropcore Panjang"
                    : "🔴 Terlalu Jauh"}
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-white">Hasil Analisis Jangkauan Fiber</h3>
              <p className="text-[11px] text-gray-400 line-clamp-1">{coverageResult.target.label}</p>
            </div>
            <button
              onClick={() => setCoverageResult(null)}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg cursor-pointer bg-gray-800/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Metrics: Jarak & Dropcore */}
          <div className="grid grid-cols-2 gap-2.5 my-3">
            <div className="p-2.5 rounded-2xl bg-gray-800/80 border border-gray-700/70">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jarak Lurus Tiang</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-black text-white">{coverageResult.best.straightDist}</span>
                <span className="text-xs text-gray-400">Meter</span>
              </div>
              <p className="text-[9px] text-gray-500 mt-0.5">Titik ke Tiang ODP</p>
            </div>

            <div className="p-2.5 rounded-2xl bg-gray-800/80 border border-gray-700/70">
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Est. Kabel Dropcore</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-black text-amber-300">~{coverageResult.best.estCable}</span>
                <span className="text-xs text-gray-400">Meter</span>
              </div>
              <p className="text-[9px] text-gray-500 mt-0.5">+15% kendur & tiang rumah</p>
            </div>
          </div>

          {/* Nearest ODP Detail Box */}
          <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs border border-emerald-500/40">
                  ODP
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{coverageResult.best.name}</h4>
                  <p className="text-[10px] text-emerald-300">{coverageResult.best.odc || "ODC Distribusi"}</p>
                </div>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded ${coverageResult.best.matchedStatus === "Diperbaiki" ? "bg-amber-500 text-slate-900 animate-pulse" : "bg-emerald-500 text-slate-950"}`}>
                {coverageResult.best.matchedStatus || "Aman"}
              </span>
            </div>

            {/* Description Note */}
            <p className="text-[11px] text-gray-300 leading-relaxed border-t border-emerald-500/20 pt-2">
              {coverageResult.best.tierDesc}
            </p>
          </div>

          {/* Collapsible Alternative ODPs */}
          {coverageResult.alternatives && coverageResult.alternatives.length > 0 && (
            <div className="mt-3 border-t border-gray-800 pt-2">
              <button
                type="button"
                onClick={() => setShowAlternatives(!showAlternatives)}
                className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-white py-1 cursor-pointer font-bold"
              >
                <span>ODP Alternatif Lain ({coverageResult.alternatives.length})</span>
                {showAlternatives ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showAlternatives && (
                <div className="space-y-1.5 mt-2">
                  {coverageResult.alternatives.map((alt) => (
                    <div
                      key={alt.id}
                      onClick={() => flyToNode(alt)}
                      className="flex items-center justify-between p-2 rounded-xl bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 text-xs cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="font-bold text-gray-200 text-xs">{alt.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-xs text-amber-300 font-bold">{alt.straightDist}m</span>
                        <span className="text-[10px] text-gray-400 block">(kabel ~{alt.estCable}m)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Action Buttons: WhatsApp & Lead & Maps */}
          <div className="grid grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-gray-800 pb-1 sm:pb-0">
            {/* Salin WA */}
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="flex items-center justify-center gap-1.5 py-3 sm:py-2 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95 transition-all cursor-pointer"
              title="Salin ringkasan hasil survey coverage siap kirim ke WhatsApp"
            >
              {copiedText === "whatsapp" ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Format Tersalin!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Salin WA</span>
                </>
              )}
            </button>

            {/* Tambah Lead */}
            {onSaveLead ? (
              <button
                type="button"
                onClick={handleSaveToLead}
                className="flex items-center justify-center gap-1.5 py-3 sm:py-2 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md active:scale-95 transition-all cursor-pointer font-black"
              >
                <UserPlus className="w-4 h-4 text-slate-950" />
                <span>+ Buat Lead</span>
              </button>
            ) : (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${coverageResult.target.lat},${coverageResult.target.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-3 sm:py-2 px-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-95 transition-all"
              >
                <Navigation className="w-4 h-4" />
                <span>Buka Rute Maps</span>
              </a>
            )}
          </div>
        </div>
      )}

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
        <div className="fixed inset-x-3 bottom-3 sm:absolute sm:inset-x-auto sm:top-16 sm:right-3 w-auto sm:w-88 z-40 bg-gray-900/95 backdrop-blur-xl border border-gray-700/80 rounded-2xl sm:rounded-3xl p-4 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-right-4 duration-200 max-h-[80vh] overflow-y-auto">
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
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                      selectedNode.status === "Diperbaiki"
                        ? "bg-amber-500 text-slate-900 animate-pulse"
                        : "bg-emerald-500 text-slate-900"
                    }`}
                  >
                    {selectedNode.status || "Aman"}
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-white mt-0.5">{selectedNode.name}</h3>
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg cursor-pointer bg-gray-800/60"
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
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Google Earth 3D</span>
            </a>

            {/* Buka di Google Maps Navigasi */}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${selectedNode.lat},${selectedNode.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Rute Maps</span>
            </a>
          </div>

          {/* Quick status toggle button (Sinkronisasi Langsung ke Tabel) */}
          {onToggleStatus && selectedNode.matchedOdp && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onToggleStatus(selectedNode.matchedOdp);
                  setSelectedNode((prev) => ({
                    ...prev,
                    status: prev.status === "Aman" ? "Diperbaiki" : "Aman",
                    matchedOdp: {
                      ...prev.matchedOdp,
                      status: prev.matchedOdp.status === "Aman" ? "Diperbaiki" : "Aman",
                    },
                  }));
                }}
                className="w-full py-2.5 sm:py-1.5 px-3 rounded-xl text-xs font-bold bg-gray-800 hover:bg-gray-700 active:scale-95 text-amber-300 border border-gray-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>
                  {selectedNode.status === "Aman"
                    ? "🟡 Ubah Status: Perlu Perbaikan"
                    : "🟢 Ubah Status: Aman (Normal)"}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 6. Sidebar Navigasi Cepat Titik ODP/ODC (Collapsible) */}
      <div
        className={`absolute top-16 left-3 bottom-14 z-20 w-[calc(100%-24px)] sm:w-72 bg-gray-900/95 backdrop-blur-xl border border-gray-700/80 rounded-2xl sm:rounded-3xl p-3 flex flex-col shadow-2xl transition-all duration-300 ${
          isSidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-[110%] opacity-0 pointer-events-none"
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
