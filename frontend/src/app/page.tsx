"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sprout, CloudRain, ShieldAlert, BarChart3, MessageSquare, ArrowRight, User, Shield, HelpCircle, HardDrive } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LandingPage() {
  const router = useRouter();
  const [role, setRole] = useState<"farmer" | "government">("farmer");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDemoLogin = (selectedRole: "farmer" | "government") => {
    setIsLoading(true);
    // Simulate setting local storage tokens for demo
    localStorage.setItem("token", "demo_jwt_token");
    localStorage.setItem("username", selectedRole === "farmer" ? "farmer_krishan" : "gov_officer_orissa");
    localStorage.setItem("role", selectedRole);
    localStorage.setItem("language", "en");
    
    setTimeout(() => {
      setIsLoading(false);
      if (selectedRole === "farmer") {
        router.push("/farmer");
      } else {
        router.push("/government");
      }
    }, 800);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!username || !password) {
      setError("Please fill in all fields.");
      setIsLoading(false);
      return;
    }

    try {
      // Standard OAuth2 form request to our FastAPI backend
      const details: Record<string, string> = {
        username: username,
        password: password,
      };

      const formBody = Object.keys(details)
        .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(details[key]))
        .join("&");

      const response = await fetch(`${API_URL}/api/auth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody,
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("username", username);
        
        // Fetch user info to determine role
        const meRes = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${data.access_token}`,
          },
        });
        
        if (meRes.ok) {
          const meData = await meRes.json();
          localStorage.setItem("role", meData.role);
          localStorage.setItem("language", meData.language);
          
          if (meData.role === "government") {
            router.push("/government");
          } else {
            router.push("/farmer");
          }
        } else {
          localStorage.setItem("role", role);
          router.push(role === "farmer" ? "/farmer" : "/government");
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.detail || "Invalid username or password. (Ensure FastAPI backend is running, or use quick access buttons below!)");
      }
    } catch (err) {
      // Offline fallback: authenticate user as demo
      console.warn("Backend unavailable, logging in via fallback client authentication.", err);
      localStorage.setItem("token", "demo_jwt_token");
      localStorage.setItem("username", username);
      localStorage.setItem("role", role);
      localStorage.setItem("language", "en");
      
      if (role === "government") {
        router.push("/government");
      } else {
        router.push("/farmer");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-[#06090e]">
      {/* Background glowing decorations */}
      <div className="bg-glow-green top-[-100px] left-[-100px]"></div>
      <div className="bg-glow-blue bottom-[-100px] right-[-100px]"></div>

      {/* Main Navigation Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <Sprout className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent">
              KrishiSaarthi AI
            </h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Precision Agriculture Platform</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Version 1.0.0
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center flex-grow">
        
        {/* Left Side: Pitch and Features */}
        <div className="lg:col-span-7 flex flex-col gap-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium w-fit">
            <span>🌾 Empowering Indian Farmers & Policymakers</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white">
            Smart Satellite Monitoring & <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Precision Water Advisories
            </span>
          </h2>
          
          <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
            KrishiSaarthi AI fuses Sentinel-1 SAR and Sentinel-2 multi-spectral imagery with local forecast weather to dynamically track field health, calculate evapotranspiration indices, predict disease vectors, and deliver localized SMS advice.
          </p>

          {/* Grid Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="p-4 rounded-xl border border-white/5 bg-slate-900/30 backdrop-blur-sm flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mt-0.5">
                <Sprout className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">AI Crop Identification</h4>
                <p className="text-xs text-slate-400 mt-1">Sentinel radar Phenology mapping for Wheat, Paddy, Maize, Sugarcane & Cotton.</p>
              </div>
            </div>
            
            <div className="p-4 rounded-xl border border-white/5 bg-slate-900/30 backdrop-blur-sm flex items-start gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mt-0.5">
                <CloudRain className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Rain-Aware Scheduling</h4>
                <p className="text-xs text-slate-400 mt-1">Smart water requirements calculation, saving up to 25% irrigation water.</p>
              </div>
            </div>
            
            <div className="p-4 rounded-xl border border-white/5 bg-slate-900/30 backdrop-blur-sm flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 mt-0.5">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Disease Vector Alerts</h4>
                <p className="text-xs text-slate-400 mt-1">Predicting blast & rust probabilities based on climate humidity thresholds.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-white/5 bg-slate-900/30 backdrop-blur-sm flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mt-0.5">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Multilingual Chatbot</h4>
                <p className="text-xs text-slate-400 mt-1">AI advisor answers queries about leaf yellowing and health in Odia, Hindi, and English.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form with Demogateway */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto">
          <div className="glass-panel p-6 sm:p-8 rounded-2xl relative">
            <h3 className="text-xl font-bold text-white mb-2">Access Portal</h3>
            <p className="text-xs text-slate-400 mb-6">Log in with your credentials or tap a Demo Access profile below.</p>

            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select Role</label>
                <div className="grid grid-cols-2 gap-2 p-1.5 rounded-xl bg-slate-950/60 border border-white/5">
                  <button
                    type="button"
                    onClick={() => setRole("farmer")}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                      role === "farmer"
                        ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    Farmer
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("government")}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                      role === "government"
                        ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Government
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Username</label>
                <input
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-input px-4 py-2.5 rounded-xl text-sm"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs leading-relaxed">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold text-sm shadow-[0_4px_20px_rgba(16,185,129,0.25)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Authenticating..." : "Log In"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="relative flex py-3 items-center">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Demo Access</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleDemoLogin("farmer")}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-white/5 bg-slate-900/20 hover:bg-slate-900/40 hover:border-emerald-500/30 text-center transition-all cursor-pointer group"
              >
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 mb-1.5 group-hover:scale-105 transition-all">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-white">Farmer Portal</span>
                <span className="text-[9px] text-slate-400 mt-0.5">Quick Demo</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin("government")}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-white/5 bg-slate-900/20 hover:bg-slate-900/40 hover:border-emerald-500/30 text-center transition-all cursor-pointer group"
              >
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 mb-1.5 group-hover:scale-105 transition-all">
                  <Shield className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-white">Government</span>
                <span className="text-[9px] text-slate-400 mt-0.5">District Maps</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-slate-500 font-medium">
          © {new Date().getFullYear()} KrishiSaarthi AI Platform. Built for Indian agro-ecological zones.
        </p>
        <div className="flex gap-4 text-xs text-slate-400 font-semibold">
          <a href="#" className="hover:text-emerald-400 transition-colors">Offline PWA Config</a>
          <span className="text-slate-600">•</span>
          <a href="#" className="hover:text-emerald-400 transition-colors">Sentinel API Docs</a>
        </div>
      </footer>
    </div>
  );
}
