import React, { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, Marker, Line as RSMLine, ZoomableGroup, Graticule } from "react-simple-maps";
import { ArrowLeft, Radar, AlertTriangle, AlertCircle, Activity, Globe, Database, Crosshair, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const MapPage = () => {
  const [locationData, setLocationData] = useState([]);
  const [statsData, setStatsData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [tooltipContent, setTooltipContent] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [mapCenter, setMapCenter] = useState([20, 20]);
  const [mapZoom, setMapZoom] = useState(1.2);
  const [isAnimatingMap, setIsAnimatingMap] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);

  const animateMapTo = (center, zoom) => {
    setIsAnimatingMap(true);
    setMapCenter(center);
    setMapZoom(zoom);
    setTimeout(() => setIsAnimatingMap(false), 800);
  };

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const now = new Date();
        const fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const toDate = now.toISOString();

        const [locRes, statRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/dashboard/locations?from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(toDate)}`),
          fetch(`${API_BASE_URL}/api/dashboard/stats?from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(toDate)}`)
        ]);

        if (locRes.ok) {
          const data = await locRes.json();
          setLocationData(data);
        }
        if (statRes.ok) {
          const stats = await statRes.json();
          setStatsData(stats);
        }
      } catch (err) {
        console.error("Error fetching map data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
    const interval = setInterval(fetchAllData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Live Stream from Real Database Logs
  useEffect(() => {
    const fetchRecentLogs = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/detail/logs?limit=30`);
        if (res.ok) {
          const data = await res.json();
          const intOrZero = (val) => { try { return parseInt(val) || 0; } catch { return 0; } };

          const newLogs = (data.logs || [])
            .map(log => {
              const isAttack = intOrZero(log.predicted_label) > 0;
              const conf = parseFloat(log.confidence || 0);
              let type = isAttack ? (conf >= 0.8 ? 'HIGH' : 'MEDIUM') : 'LOW';
              
              let timeStr = log.created_at;
              try { timeStr = new Date(timeStr.replace("Z", "+00:00")).toLocaleTimeString(); } catch (e) {}

              return { id: log.id, type, region: log.region || 'Unknown', ip: log.srcaddr || 'Unknown', time: timeStr };
            });
            
          setLiveEvents(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const distinctNew = newLogs.filter(n => !existingIds.has(n.id));
            if (distinctNew.length === 0) return prev;
            return [...distinctNew, ...prev].slice(0, 15);
          });
        }
      } catch (err) {}
    };
    
    fetchRecentLogs();
    const interval = setInterval(fetchRecentLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalThreats = locationData.reduce((acc, loc) => acc + loc.attack, 0);
  const topRegion = [...locationData].sort((a,b) => b.attack - a.attack)[0]?.name || "None";

  return (
    <div className="min-h-screen bg-black text-white font-inter flex relative overflow-hidden">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #3b82f6; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .map-animating .rsm-zoomable-group { transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) !important; }
      `}</style>
      
      {/* Background Map layer */}
      <div className={`absolute inset-0 z-0 ${isAnimatingMap ? 'map-animating' : ''} cursor-grab active:cursor-grabbing`}>
        <ComposableMap projection="geoMercator" projectionConfig={{ scale: 190 }} className="w-full h-full outline-none opacity-80">
            <ZoomableGroup 
            center={mapCenter} 
            zoom={mapZoom} 
            onMoveEnd={({ coordinates, zoom }) => {
                if (!isAnimatingMap) {
                  setMapCenter(coordinates);
                  setMapZoom(zoom);
                }
            }}
            minZoom={1} maxZoom={20}
            >
            <Graticule stroke="#1e293b" strokeWidth={0.5} />
            <Geographies geography="https://unpkg.com/world-atlas@2.0.2/countries-110m.json">
                {({ geographies }) =>
                geographies.map((geo) => (
                    <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#020617"
                    stroke="#1e3a8a"
                    strokeWidth={0.5}
                    onMouseEnter={(e) => {
                        setTooltipContent(`Country: ${geo.properties.name}`);
                        setTooltipPosition({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseMove={(e) => {
                        setTooltipPosition({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => setTooltipContent("")}
                    style={{
                        default: { outline: "none", transition: "all 250ms" },
                        hover: { fill: "#1e293b", stroke: "#3b82f6", outline: "none", transition: "all 250ms", cursor: "pointer" },
                        pressed: { outline: "none" },
                    }}
                    />
                ))
                }
            </Geographies>

            {/* Default Server node */}
            <Marker coordinates={[72.8, 19.0]}>
                <circle r={6} fill="#06b6d4" />
                <circle r={18} fill="#06b6d4" opacity={0.3} className="animate-ping" />
                <text y={-14} x={12} fill="#06b6d4" fontSize={10} fontWeight="bold" className="shadow-lg tracking-wider">PRIMARY REGION</text>
            </Marker>

            {locationData.map((loc, idx) => {
                if (!loc.coordinates || (loc.coordinates[0] === 0 && loc.coordinates[1] === 0)) return null;
                const isIndia = loc.coordinates[0] === 79.0 && loc.coordinates[1] === 20.6;
                const draws = [];
                if (loc.benign > 0) draws.push({ isAttack: false, color: "#10b981", offset: isIndia ? 0 : 2 });
                if (loc.attack > 0) draws.push({ isAttack: true, color: "#ef4444", offset: isIndia ? 0 : -2 });

                return (
                <g key={`loc-${idx}`}>
                    <Marker 
                    coordinates={loc.coordinates}
                    onMouseEnter={(e) => {
                        setTooltipContent(`Region: ${loc.name} -> ${loc.attack} Attacks | ${loc.benign} Normal`);
                        setTooltipPosition({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseMove={(e) => {
                        setTooltipPosition({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => setTooltipContent("")}
                    onClick={() => animateMapTo(loc.coordinates, 6)}
                    style={{ cursor: "crosshair" }}
                    >
                    <circle 
                        r={loc.attack > 0 ? 6 : 4} 
                        fill={loc.attack > 0 ? "#ef4444" : "#10b981"} 
                        className={loc.attack > 0 ? "animate-pulse" : ""} 
                    />
                    <text y={-10} x={8} fill="#e5e7eb" fontSize={8} fontWeight="bold" className="pointer-events-none drop-shadow-md">{loc.name}</text>
                    </Marker>
                    {!isIndia && draws.map((draw, i) => (
                    <RSMLine
                        key={`arc-${idx}-${i}`}
                        from={[loc.coordinates[0] + draw.offset, loc.coordinates[1] + draw.offset]}
                        to={[72.8, 19.0]}
                        stroke={draw.color}
                        strokeWidth={draw.isAttack ? 2 : 1}
                        strokeOpacity={draw.isAttack ? 0.8 : 0.4}
                        strokeLinecap="round"
                        style={{
                        strokeDasharray: draw.isAttack ? "none" : "6 6",
                        animation: draw.isAttack ? "dash 1s linear infinite" : "none"
                        }}
                    />
                    ))}
                </g>
                );
            })}
            </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Futuristic Overlay UI */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-blue-900/40 to-transparent pointer-events-none z-0 mix-blend-screen"></div>

      {/* Left Sidebar */}
      <motion.aside 
        initial={{ x: -400 }} animate={{ x: 0 }} transition={{ type: 'spring', stiffness: 100 }}
        className="relative z-10 w-96 h-screen bg-gray-900/80 backdrop-blur-xl border-r border-cyan-900/50 shadow-[20px_0_40px_rgba(0,0,0,0.5)] flex flex-col pointer-events-auto"
      >
        <div className="p-6 border-b border-gray-800">
            <Link to="/dashboard" className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-4 text-sm font-semibold uppercase tracking-wider">
                <ArrowLeft className="w-4 h-4 mr-2" /> Return to Hub
            </Link>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300 flex items-center">
                <Globe className="w-8 h-8 mr-3 text-cyan-400" />
                CloudGuard Map
            </h1>
            <p className="text-gray-400 text-sm mt-2">Live Traffic Monitoring<span className="inline-block w-2 h-2 ml-1 bg-green-500 rounded-full animate-pulse"></span></p>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-6">
            
            {/* Live Feed */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center">
                    <Activity className="w-4 h-4 mr-2 text-blue-500" />
                    Live Event Stream
                </h2>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                    <AnimatePresence>
                        {liveEvents.map(ev => (
                            <motion.div 
                                initial={{ opacity: 0, x: -20, height: 0 }} 
                                animate={{ opacity: 1, x: 0, height: 'auto' }} 
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={`p-3 rounded-lg border ${ev.type === 'HIGH' ? 'bg-red-900/20 border-red-500/30' : ev.type === 'MEDIUM' ? 'bg-yellow-900/20 border-yellow-500/30' : 'bg-green-900/20 border-green-500/30'} flex flex-col justify-center relative overflow-hidden group`}
                                key={ev.id}
                            >
                                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-current to-transparent opacity-50"></div>
                                <div className="flex justify-between items-start mb-1">
                                    <div className="font-mono text-sm font-semibold tracking-tight text-gray-200">
                                        {ev.ip}
                                    </div>
                                    <div className="text-[10px] text-gray-500">{ev.time}</div>
                                </div>
                                <div className="flex items-center text-xs text-gray-400">
                                    {ev.type === 'HIGH' ? <AlertCircle className="w-3 h-3 text-red-500 mr-1.5" /> : ev.type === 'MEDIUM' ? <AlertTriangle className="w-3 h-3 text-yellow-500 mr-1.5"/> : <ShieldAlert className="w-3 h-3 text-green-500 mr-1.5"/>}
                                    {ev.region}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {liveEvents.length === 0 && <div className="text-center text-gray-600 text-sm italic py-4">Awaiting signal...</div>}
                </div>
            </div>

        </div>
      </motion.aside>

      {/* Right Side Widgets (Floating) */}
      <div className="absolute right-6 top-6 z-10 flex flex-col space-y-4 pointer-events-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 p-5 rounded-2xl shadow-xl w-64">
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2 flex items-center">
                <Crosshair className="w-4 h-4 mr-2" /> Threat Origins
            </h3>
            <div className="text-4xl font-black text-white">{totalThreats}</div>
            <div className="text-sm text-red-400 mt-1">Globally Distributed</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 p-5 rounded-2xl shadow-xl w-64">
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2 flex items-center">
                <Database className="w-4 h-4 mr-2" /> Top Target Region
            </h3>
            <div className="text-2xl font-bold tracking-tight text-white capitalize">{topRegion}</div>
            <div className="text-sm text-yellow-400 mt-1">High Focus</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-gray-900/80 backdrop-blur-xl border border-gray-700/50 p-5 rounded-2xl shadow-xl w-64">
             <button 
                onClick={() => animateMapTo([20, 20], 1.2)}
                className="w-full bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 text-blue-400 font-semibold py-2 px-4 rounded-xl transition-all duration-300 flex items-center justify-center uppercase tracking-widest text-xs"
             >
                 <Globe className="w-4 h-4 mr-2" /> Reset View
             </button>
        </motion.div>
      </div>

      {/* Universal Tooltip */}
      {tooltipContent && (
        <div 
          className="fixed z-50 px-4 py-2 font-mono text-xs font-bold text-cyan-50 bg-gray-900/95 border border-cyan-500/50 rounded pointer-events-none shadow-[0_0_15px_rgba(6,182,212,0.5)] backdrop-blur-sm"
          style={{ top: tooltipPosition.y - 25, left: tooltipPosition.x + 15 }}
        >
          {tooltipContent}
        </div>
      )}
    </div>
  );
};

export default MapPage;
