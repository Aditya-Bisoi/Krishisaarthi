"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { 
  Sprout, Droplet, ShieldAlert, BarChart3, TrendingUp, 
  MapPin, LogOut, ArrowLeft, RefreshCw, Layers, CheckCircle2 
} from "lucide-react";

// Chart.js registration & components
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Dynamically import GovernmentMap to disable SSR
const GovernmentMap = dynamic(() => import("@/components/GovernmentMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[360px] flex items-center justify-center bg-slate-950/40 border border-white/5 rounded-2xl">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="text-slate-400 text-xs font-semibold">Loading National GIS Grid Map...</span>
      </div>
    </div>
  )
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Mock District Baseline data for government analytics fallback
const DEFAULT_ANALYTICS = {
  districts: [
    { district: "Cuttack", field_count: 142, total_area_hectares: 312.4, average_water_stress: 22.5, irrigation_demand_m3: 12500, projected_yield_tons: 1810.0, crop_distribution: { Paddy: 250.0, Sugarcane: 62.4 } },
    { district: "Ludhiana", field_count: 210, total_area_hectares: 540.8, average_water_stress: 68.2, irrigation_demand_m3: 45600, projected_yield_tons: 3350.0, crop_distribution: { Wheat: 450.0, Maize: 90.8 } },
    { district: "Nashik", field_count: 98, total_area_hectares: 185.2, average_water_stress: 45.8, irrigation_demand_m3: 18400, projected_yield_tons: 810.0, crop_distribution: { Cotton: 120.0, Maize: 65.2 } },
    { district: "Vijayawada", field_count: 115, total_area_hectares: 290.0, average_water_stress: 31.0, irrigation_demand_m3: 19200, projected_yield_tons: 1680.0, crop_distribution: { Paddy: 180.0, Cotton: 110.0 } },
    { district: "Bathinda", field_count: 154, total_area_hectares: 395.5, average_water_stress: 78.4, irrigation_demand_m3: 38900, projected_yield_tons: 2450.0, crop_distribution: { Wheat: 320.5, Cotton: 75.0 } }
  ],
  critical_alerts: [
    { district: "Bathinda", severity: "CRITICAL", water_stress_index: 78.4, active_crop: "Wheat", message: "District Bathinda exhibits severe drought index levels (78.4%). Recommend emergency canal releases." },
    { district: "Ludhiana", severity: "WARNING", water_stress_index: 68.2, active_crop: "Wheat", message: "Ludhiana reports water stress above limits (68.2%). High weather temperatures predicted." }
  ]
};

export default function GovernmentDashboard() {
  const router = useRouter();
  
  // Auth details
  const [authToken, setAuthToken] = useState("");
  const [username, setUsername] = useState("Gov Official");
  
  // Data State
  const [analytics, setAnalytics] = useState<any>(DEFAULT_ANALYTICS);
  const [selectedDistrict, setSelectedDistrict] = useState("Ludhiana");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token") || "";
    const savedUser = localStorage.getItem("username") || "Gov Official";
    
    setAuthToken(token);
    setUsername(savedUser);
    
    fetchAnalytics(token);
  }, []);

  const fetchAnalytics = async (token: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/government/analytics`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
        if (data.districts && data.districts.length > 0) {
          // Verify selected district is in list, else default
          const found = data.districts.some((d: any) => d.district === selectedDistrict);
          if (!found) {
            setSelectedDistrict(data.districts[0].district);
          }
        }
      }
    } catch (e) {
      console.warn("Backend down. Running government dashboard in simulated sandbox.");
    } finally {
      setIsLoading(false);
    }
  };

  // Find active selected district details
  const activeDistrictData = analytics.districts.find(
    (d: any) => d.district === selectedDistrict
  ) || analytics.districts[0];

  // Log out
  const handleLogout = () => {
    localStorage.clear();
    router.push("/");
  };

  // Calculate Cumulative aggregates
  const totalMonitoredArea = analytics.districts.reduce((acc: number, d: any) => acc + d.total_area_hectares, 0);
  const avgNationalStress = analytics.districts.reduce((acc: number, d: any) => acc + d.average_water_stress, 0) / analytics.districts.length;
  const cumulativeWaterDemand = analytics.districts.reduce((acc: number, d: any) => acc + d.irrigation_demand_m3, 0);
  const totalProjectedOutput = analytics.districts.reduce((acc: number, d: any) => acc + d.projected_yield_tons, 0);

  // Chart 1: Crop distribution in active district (Doughnut)
  const cropDist = activeDistrictData.crop_distribution;
  const cropLabels = Object.keys(cropDist);
  const cropValues = Object.values(cropDist);
  const cropColors = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];

  const doughnutData = {
    labels: cropLabels,
    datasets: [{
      data: cropValues,
      backgroundColor: cropColors.slice(0, cropLabels.length),
      borderColor: "rgba(15, 23, 42, 0.65)",
      borderWidth: 2,
    }]
  };

  // Chart 2: District-wise water stress level (Bar)
  const districtNames = analytics.districts.map((d: any) => d.district);
  const stressLevels = analytics.districts.map((d: any) => d.average_water_stress);
  const barColors = stressLevels.map((val: number) => val > 65 ? "rgba(239, 68, 68, 0.7)" : val > 35 ? "rgba(245, 158, 11, 0.7)" : "rgba(16, 185, 129, 0.7)");

  const barData = {
    labels: districtNames,
    datasets: [{
      label: "Water Stress index (%)",
      data: stressLevels,
      backgroundColor: barColors,
      borderColor: "rgba(255,255,255,0.05)",
      borderWidth: 1,
      borderRadius: 6,
    }]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#94a3b8" },
        max: 100
      },
      x: {
        grid: { display: false },
        ticks: { color: "#94a3b8" }
      }
    }
  };

  // Chart 3: Expected output Yield Projection (Line)
  const lineData = {
    labels: districtNames,
    datasets: [{
      label: "Yield Forecast (Tons)",
      data: analytics.districts.map((d: any) => d.projected_yield_tons),
      fill: true,
      backgroundColor: "rgba(16, 185, 129, 0.15)",
      borderColor: "#10b981",
      borderWidth: 2,
      tension: 0.3,
      pointBackgroundColor: "#fff",
      pointBorderColor: "#10b981",
    }]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#94a3b8" }
      },
      x: {
        grid: { display: false },
        ticks: { color: "#94a3b8" }
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 flex flex-col justify-between relative">
      {/* Glow blobs */}
      <div className="bg-glow-blue top-[10%] left-[-100px] opacity-75"></div>
      <div className="bg-glow-green bottom-0 right-[-100px] opacity-50"></div>

      {/* Navigation Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-b border-white/5 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-white">KrishiSaarthi AI</h1>
            <p className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase">Government Sector Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-white/5 text-xs text-slate-400 hover:text-white transition-all cursor-pointer bg-slate-900/60"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Home
          </button>
          
          <button
            onClick={() => fetchAnalytics(authToken)}
            className="p-2 rounded-lg border border-white/5 text-slate-400 hover:text-white transition-all cursor-pointer bg-slate-900/60"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
          </button>
          
          <span className="text-slate-700 hidden sm:inline">|</span>

          {/* User badge */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-400 text-xs uppercase">
              {username.charAt(0)}
            </div>
            <span className="text-xs font-bold text-slate-300 hidden md:inline">{username}</span>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 rounded-lg bg-slate-900/60 border border-white/5 text-slate-400 hover:text-red-400 hover:border-red-500/20 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main content grid */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex flex-col gap-6 flex-grow">
        
        {/* Row 1: Overviews (4 Stat cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-2xl flex items-center gap-3">
            <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Monitored Area</span>
              <span className="text-xl font-extrabold text-white mt-0.5">{totalMonitoredArea.toFixed(1)} Hectares</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-500/10 text-red-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Avg Water Stress</span>
              <span className="text-xl font-extrabold text-white mt-0.5">{avgNationalStress.toFixed(1)}% Index</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Droplet className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Canal Release Demand</span>
              <span className="text-xl font-extrabold text-white mt-0.5">{cumulativeWaterDemand.toLocaleString()} m³</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Forecast Output</span>
              <span className="text-xl font-extrabold text-white mt-0.5">{totalProjectedOutput.toLocaleString()} Tons</span>
            </div>
          </div>
        </div>

        {/* Row 2: Grid and Main Map visualizer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* GIS map (7 columns) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="glass-panel p-4 rounded-2xl flex-grow flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">District Water stress Grid Mapping</h3>
              </div>
              <div className="w-full h-[360px] min-h-[360px]">
                <GovernmentMap
                  districts={analytics.districts}
                  selectedDistrict={selectedDistrict}
                  onSelectDistrict={(name) => setSelectedDistrict(name)}
                />
              </div>
            </div>
          </div>

          {/* District list & stress levels (5 columns) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            
            {/* Stress alerts list */}
            <div className="glass-panel p-5 rounded-2xl flex flex-col gap-3">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-white border-b border-white/5 pb-2">
                Monitored districts stress index
              </h3>
              
              <div className="flex flex-col gap-2.5 max-h-[310px] overflow-y-auto pr-1">
                {analytics.districts.map((d: any) => {
                  const isHigh = d.average_water_stress > 65;
                  const isSelected = d.district === selectedDistrict;
                  return (
                    <button
                      key={d.district}
                      onClick={() => setSelectedDistrict(d.district)}
                      className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                        isSelected 
                          ? "bg-cyan-500/10 border-cyan-500/30" 
                          : "bg-slate-900/30 border-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">{d.district} District</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          Monitored Area: {d.total_area_hectares} Ha | Fields: {d.field_count}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold" style={{ color: isHigh ? "#ef4444" : d.average_water_stress > 35 ? "#f59e0b" : "#10b981" }}>
                          {d.average_water_stress}% Stress
                        </span>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isHigh ? "#ef4444" : d.average_water_stress > 35 ? "#f59e0b" : "#10b981" }}></div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Critical warnings & Analytics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Warnings box (4 columns) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <div className="glass-panel p-5 rounded-2xl flex-grow flex flex-col gap-4 bg-slate-900/40">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-white border-b border-white/5 pb-2">
                Drought alerts trigger panel
              </h3>

              <div className="flex flex-col gap-3">
                {analytics.critical_alerts.map((alert: any, idx: number) => (
                  <div 
                    key={idx} 
                    className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex flex-col gap-2 animate-pulse"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-red-400" />
                        {alert.severity} ({alert.water_stress_index}% Stress)
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-950/60 text-slate-400">
                        {alert.active_crop} Sector
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-red-300/90">{alert.message}</p>
                  </div>
                ))}
                
                {analytics.critical_alerts.length === 0 && (
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    All sectors operating below drought thresholds.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Graphical Analytics (8 columns) */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Chart 1: Doughnut Crop share */}
            <div className="glass-panel p-5 rounded-2xl flex flex-col gap-3 md:col-span-1">
              <h4 className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
                Crop distribution ({selectedDistrict})
              </h4>
              <div className="relative w-full h-[180px] flex items-center justify-center">
                <Doughnut 
                  data={doughnutData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "bottom",
                        labels: { color: "#94a3b8", boxWidth: 10, font: { size: 9 } }
                      }
                    }
                  }} 
                />
              </div>
            </div>

            {/* Chart 2: Bar stress comparison */}
            <div className="glass-panel p-5 rounded-2xl flex flex-col gap-3 md:col-span-1">
              <h4 className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
                District stress levels index
              </h4>
              <div className="w-full h-[180px]">
                <Bar data={barData} options={barOptions} />
              </div>
            </div>

            {/* Chart 3: Yield projections Line */}
            <div className="glass-panel p-5 rounded-2xl flex flex-col gap-3 md:col-span-1">
              <h4 className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
                Yield forecasts prognosis
              </h4>
              <div className="w-full h-[180px]">
                <Line data={lineData} options={lineOptions} />
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 font-semibold">
        <span>© 2026 KrishiSaarthi AI Gov Sector analytics portal.</span>
        <span>Regional Water Resource Command Center Sync: ACTIVE</span>
      </footer>
    </div>
  );
}
