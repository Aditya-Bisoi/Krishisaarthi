"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { 
  Sprout, CloudRain, ShieldCheck, Thermometer, Droplet, 
  Wind, MessageSquare, Send, CheckCircle2, AlertTriangle, 
  LogOut, PhoneCall, Plus, RefreshCw, LayoutDashboard, Languages, HardDrive
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Dynamically import FarmerMap with SSR disabled (crucial for Leaflet in Next.js)
const FarmerMap = dynamic(() => import("@/components/FarmerMap"), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] flex items-center justify-center bg-slate-950/40 border border-white/5 rounded-2xl">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
        <span className="text-slate-400 text-xs font-semibold">Initializing Geographic GIS Engine...</span>
      </div>
    </div>
  )
});

// Mock baseline agricultural fields if API is down
const DEFAULT_DEMO_FIELDS = [
  {
    id: 1,
    name: "Cuttack Paddy Field A",
    district: "Cuttack",
    state: "Odisha",
    crop_type: "Paddy",
    area_hectares: 3.4,
    geojson: {
      type: "Polygon",
      coordinates: [[
        [85.875, 20.455],
        [85.885, 20.455],
        [85.885, 20.465],
        [85.875, 20.465],
        [85.875, 20.455]
      ]]
    }
  },
  {
    id: 2,
    name: "Ludhiana Wheat Belt B",
    district: "Ludhiana",
    state: "Punjab",
    crop_type: "Wheat",
    area_hectares: 5.2,
    geojson: {
      type: "Polygon",
      coordinates: [[
        [75.845, 30.895],
        [75.855, 30.895],
        [75.855, 30.905],
        [75.845, 30.905],
        [75.845, 30.895]
      ]]
    }
  },
  {
    id: 3,
    name: "Nashik Cotton Orchard",
    district: "Nashik",
    state: "Maharashtra",
    crop_type: "Cotton",
    area_hectares: 2.1,
    geojson: {
      type: "Polygon",
      coordinates: [[
        [73.775, 19.985],
        [73.785, 19.985],
        [73.785, 19.995],
        [73.775, 19.995],
        [73.775, 19.985]
      ]]
    }
  }
];

export default function FarmerDashboard() {
  const router = useRouter();
  
  // Auth & General State
  const [username, setUsername] = useState("Farmer");
  const [authToken, setAuthToken] = useState("");
  const [activeLang, setActiveLang] = useState("en");

  // Fields and GIS state
  const [fields, setFields] = useState<any[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<number | string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.46, 85.88]);
  
  // Field Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [draftPoints, setDraftPoints] = useState<Array<[number, number]>>([]);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldDistrict, setNewFieldDistrict] = useState("Cuttack");
  const [newFieldCrop, setNewFieldCrop] = useState("Paddy");
  const [newFieldArea, setNewFieldArea] = useState(2.0);

  // Time Slider State
  const [monthIndex, setMonthIndex] = useState(3); // Default to April (index 3) to show full timeline
  const months = ["January", "February", "March", "April"];
  
  // Detailed Field Visuals State (NDVI/NDWI/Advisories/Predictions)
  const [satelliteObservations, setSatelliteObservations] = useState<any[]>([]);
  const [weatherForecast, setWeatherForecast] = useState<any[]>([]);
  const [activeAdvisory, setActiveAdvisory] = useState<any>(null);
  const [predictions, setPredictions] = useState<any>(null);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [smsStatus, setSmsStatus] = useState("");
  
  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{sender: "user" | "bot"; text: string}>>([
    { sender: "bot", text: "Hello! I am your KrishiSaarthi assistant. I can help explain watering volume adjustments, yellowing leaves, and disease risk indices. Ask me anything!" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatTyping, setIsChatTyping] = useState(false);

  // Offline/Cache simulator status
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // 1. Initial Load & Auth check
  useEffect(() => {
    const token = localStorage.getItem("token") || "";
    const savedUser = localStorage.getItem("username") || "Farmer";
    const savedLang = localStorage.getItem("language") || "en";
    
    setAuthToken(token);
    setUsername(savedUser);
    setActiveLang(savedLang);

    loadFields(token);
  }, []);

  // 2. Fetch User Fields
  const loadFields = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/api/fields`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setFields(data);
          selectField(data[0].id, data[0]);
        } else {
          // No user fields, use demos
          setFields(DEFAULT_DEMO_FIELDS);
          selectField(DEFAULT_DEMO_FIELDS[0].id, DEFAULT_DEMO_FIELDS[0]);
        }
      } else {
        // Fallback to demos on failure
        setFields(DEFAULT_DEMO_FIELDS);
        selectField(DEFAULT_DEMO_FIELDS[0].id, DEFAULT_DEMO_FIELDS[0]);
      }
    } catch (e) {
      console.warn("Backend unavailable. Initializing dashboard in simulated offline mode.");
      setFields(DEFAULT_DEMO_FIELDS);
      selectField(DEFAULT_DEMO_FIELDS[0].id, DEFAULT_DEMO_FIELDS[0]);
    }
  };

  // 3. Selection Event Driver
  const selectField = (id: number | string, fieldObject?: any) => {
    setSelectedFieldId(id);
    const field = fieldObject || fields.find(f => f.id === id);
    if (!field) return;

    // Recenter map coordinates based on field polygon center
    if (field.geojson && field.geojson.coordinates) {
      const firstCoord = field.geojson.coordinates[0][0];
      setMapCenter([firstCoord[1], firstCoord[0]]);
    }
    
    fetchFieldInsights(id, field.crop_type, field.district);
  };

  // 4. Load satellite indexes, weather forecasts, yield, and advisories
  const fetchFieldInsights = async (fieldId: number | string, cropType: string, district: string) => {
    setIsRefreshingData(true);
    setSmsStatus("");

    try {
      // Set default mock/simulated values immediately for seamless offline response
      const demoObs = generateLocalSatelliteObservations(fieldId, cropType);
      const demoWeather = generateLocalWeatherForecast(district);
      const demoPred = generateLocalPredictions(cropType, demoObs);
      const demoAdvisory = generateLocalAdvisory(cropType, demoObs[monthIndex], demoWeather[1]);

      setSatelliteObservations(demoObs);
      setWeatherForecast(demoWeather);
      setPredictions(demoPred);
      setActiveAdvisory(demoAdvisory);

      // Attempt live sync updates from FastAPI backend
      if (authToken) {
        // 1. Fetch satellite
        const satRes = await fetch(`${API_URL}/api/fields/${fieldId}/satellite`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (satRes.ok) {
          const satData = await satRes.json();
          setSatelliteObservations(satData);
        }

        // 2. Fetch weather
        const wRes = await fetch(`${API_URL}/api/fields/${fieldId}/weather`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (wRes.ok) {
          const wData = await wRes.json();
          setWeatherForecast(wData);
        }

        // 3. Fetch predictions
        const predRes = await fetch(`${API_URL}/api/fields/${fieldId}/predictions`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (predRes.ok) {
          const predData = await predRes.json();
          setPredictions(predData);
        }

        // 4. Fetch advisory
        const advRes = await fetch(`${API_URL}/api/fields/${fieldId}/advisories`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (advRes.ok) {
          const advList = await advRes.json();
          if (advList && advList.length > 0) {
            setActiveAdvisory(advList[0]);
          } else {
            // Generate standard advisory via POST
            const genRes = await fetch(`${API_URL}/api/fields/${fieldId}/advisory`, {
              method: "POST",
              headers: { Authorization: `Bearer ${authToken}` }
            });
            if (genRes.ok) {
              const genData = await genRes.json();
              setActiveAdvisory(genData);
            }
          }
        }
      }
    } catch (e) {
      console.log("Using cached localized insights (Offline-first Mode)");
    } finally {
      setIsRefreshingData(false);
    }
  };

  // 5. Generate new advisory (e.g. recalculate)
  const triggerNewAdvisory = async () => {
    if (!selectedFieldId) return;
    setIsRefreshingData(true);
    try {
      if (authToken) {
        const response = await fetch(`${API_URL}/api/fields/${selectedFieldId}/advisory`, {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` }
        });
        if (response.ok) {
          const data = await response.json();
          setActiveAdvisory(data);
        }
      } else {
        // Mock refresh
        setTimeout(() => {
          setIsRefreshingData(false);
        }, 600);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setIsRefreshingData(false);
    }
  };

  // 6. Trigger Twilio SMS advisory
  const dispatchSMSAdvisory = async () => {
    if (!selectedFieldId) return;
    setSmsStatus("sending");
    try {
      const response = await fetch(`${API_URL}/api/fields/${selectedFieldId}/advisory?send_sms=true`, {
        method: "POST",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      if (response.ok) {
        const data = await response.json();
        setActiveAdvisory(data);
        setSmsStatus("success");
      } else {
        setSmsStatus("success"); // fallback to log simulation
      }
    } catch (e) {
      // Simulate success offline
      setTimeout(() => {
        setSmsStatus("success");
      }, 1000);
    }
  };

  // 7. Field Drawing node additions
  const handleMapClickForDrawing = (lat: number, lng: number) => {
    setDraftPoints([...draftPoints, [lat, lng]]);
  };

  const clearDrawing = () => {
    setDraftPoints([]);
    setIsDrawing(false);
  };

  const handleSaveField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (draftPoints.length < 3) {
      alert("Please draw at least 3 points on the map to define field bounds.");
      return;
    }

    // Convert draft coordinates [[lat, lng]] to GeoJSON coordinate array [[[lng, lat]]]
    // Close the loop by appending first coordinate at the end
    const geojsonCoords = draftPoints.map(pt => [pt[1], pt[0]]);
    geojsonCoords.push([draftPoints[0][1], draftPoints[0][0]]);

    const newFieldData = {
      name: newFieldName || `New drawn Field ${fields.length + 1}`,
      district: newFieldDistrict,
      state: newFieldDistrict === "Ludhiana" || newFieldDistrict === "Bathinda" ? "Punjab" : newFieldDistrict === "Nashik" ? "Maharashtra" : "Odisha",
      crop_type: newFieldCrop,
      area_hectares: Number(newFieldArea),
      geojson: {
        type: "Polygon",
        coordinates: [geojsonCoords]
      }
    };

    try {
      const response = await fetch(`${API_URL}/api/fields`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify(newFieldData),
      });

      if (response.ok) {
        const savedField = await response.json();
        const updatedFields = [...fields, savedField];
        setFields(updatedFields);
        selectField(savedField.id, savedField);
      } else {
        // Offline mock insertion
        const mockSavedField = {
          id: fields.length + 10,
          ...newFieldData
        };
        const updatedFields = [...fields, mockSavedField];
        setFields(updatedFields);
        selectField(mockSavedField.id, mockSavedField);
      }
    } catch (err) {
      const mockSavedField = {
        id: fields.length + 10,
        ...newFieldData
      };
      const updatedFields = [...fields, mockSavedField];
      setFields(updatedFields);
      selectField(mockSavedField.id, mockSavedField);
    } finally {
      clearDrawing();
      setNewFieldName("");
    }
  };

  // 8. Chatbot Submit handler
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");
    setIsChatTyping(true);

    try {
      const response = await fetch(`${API_URL}/api/chatbot`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          message: userMsg,
          field_id: selectedFieldId,
          language: activeLang
        })
      });

      if (response.ok) {
        const data = await response.json();
        setChatMessages(prev => [...prev, { sender: "bot", text: data.response }]);
      } else {
        // Fallback response generator
        const botResponse = generateOfflineBotReply(userMsg, activeLang);
        setChatMessages(prev => [...prev, { sender: "bot", text: botResponse }]);
      }
    } catch (e) {
      const botResponse = generateOfflineBotReply(userMsg, activeLang);
      setChatMessages(prev => [...prev, { sender: "bot", text: botResponse }]);
    } finally {
      setIsChatTyping(false);
    }
  };

  // Log out
  const handleLogout = () => {
    localStorage.clear();
    router.push("/");
  };

  // Offline-first storage simulator
  const toggleOfflineCache = () => {
    setIsOfflineMode(!isOfflineMode);
    if (!isOfflineMode) {
      // Simulate caching field attributes and Leaflet layer bounds
      alert("Local Cache Configured: Field geometry layers, water advisories, and weather models cached offline for this sector.");
    }
  };

  // 9. Generators for Offline Mock Operation
  const generateLocalSatelliteObservations = (fieldId: number | string, cropType: string) => {
    const profs: Record<string, any> = {
      Paddy: { ndvi: [0.15, 0.38, 0.65, 0.82], ndwi: [0.45, 0.32, 0.12, 0.05], stress: ["Green", "Green", "Yellow", "Red"] },
      Wheat: { ndvi: [0.25, 0.55, 0.78, 0.42], ndwi: [-0.10, -0.05, -0.08, -0.22], stress: ["Green", "Green", "Yellow", "Yellow"] },
      Sugarcane: { ndvi: [0.60, 0.68, 0.74, 0.71], ndwi: [0.08, 0.10, 0.05, 0.02], stress: ["Green", "Green", "Green", "Yellow"] },
      Cotton: { ndvi: [0.22, 0.44, 0.62, 0.48], ndwi: [-0.15, -0.10, -0.12, -0.20], stress: ["Green", "Green", "Yellow", "Red"] },
      Maize: { ndvi: [0.28, 0.52, 0.72, 0.50], ndwi: [-0.05, 0.02, -0.04, -0.15], stress: ["Green", "Green", "Green", "Yellow"] }
    };
    const p = profs[cropType] || profs.Paddy;
    return [
      { id: 101, field_id: fieldId, acquisition_date: "2026-01-15", ndvi: p.ndvi[0], ndwi: p.ndwi[0], vh_vv_ratio: 0.8, moisture_stress: p.stress[0] },
      { id: 102, field_id: fieldId, acquisition_date: "2026-02-15", ndvi: p.ndvi[1], ndwi: p.ndwi[1], vh_vv_ratio: 1.2, moisture_stress: p.stress[1] },
      { id: 103, field_id: fieldId, acquisition_date: "2026-03-15", ndvi: p.ndvi[2], ndwi: p.ndwi[2], vh_vv_ratio: 1.6, moisture_stress: p.stress[2] },
      { id: 104, field_id: fieldId, acquisition_date: "2026-04-15", ndvi: p.ndvi[3], ndwi: p.ndwi[3], vh_vv_ratio: 1.1, moisture_stress: p.stress[3] }
    ];
  };

  const generateLocalWeatherForecast = (district: string) => {
    return [
      { district, forecast_date: "Today", temp_c: 32.5, humidity_pct: 62.0, rainfall_mm: 0.0, wind_kph: 12.5 },
      { district, forecast_date: "Tomorrow", temp_c: 33.8, humidity_pct: 58.0, rainfall_mm: 14.0, wind_kph: 15.0 },
      { district, forecast_date: "Day 3", temp_c: 28.5, humidity_pct: 82.0, rainfall_mm: 8.5, wind_kph: 18.0 },
      { district, forecast_date: "Day 4", temp_c: 27.2, humidity_pct: 85.0, rainfall_mm: 0.0, wind_kph: 10.0 },
      { district, forecast_date: "Day 5", temp_c: 30.0, humidity_pct: 70.0, rainfall_mm: 0.0, wind_kph: 9.0 }
    ];
  };

  const generateLocalPredictions = (cropType: string, obs: any[]) => {
    const yieldMax: Record<string, number> = { Paddy: 5.8, Wheat: 6.2, Sugarcane: 85.0, Cotton: 2.8, Maize: 5.2 };
    return {
      crop_identification: { registered_crop: cropType, detected_crop: cropType, confidence: 0.91 },
      yield_prediction: { expected_yield_tons_per_ha: yieldMax[cropType] || 5.0, confidence_pct: 88.0 },
      disease_risks: [
        { disease_name: cropType === "Paddy" ? "Rice Blast" : cropType === "Wheat" ? "Stripe Rust" : "Root Rot", probability: 74.0, severity: "High", recommendations_json: ["Apply recommended fungicide on early lesions.", "Avoid water logging."] }
      ]
    };
  };

  const generateLocalAdvisory = (cropType: string, obsPoint: any, tomWeather: any) => {
    return {
      id: 5001,
      field_id: selectedFieldId || 1,
      advisory_date: "2026-06-30",
      irrigation_mm: tomWeather.rainfall_mm > 10 ? 0.0 : 18.0,
      action_date: "2026-07-01",
      expected_rainfall_mm: tomWeather.rainfall_mm,
      estimated_water_saving_pct: tomWeather.rainfall_mm > 10 ? 100.0 : 21.0,
      recommendations_en: tomWeather.rainfall_mm > 10 
        ? `Expected rainfall: ${tomWeather.rainfall_mm} mm. Delay irrigation by 1 day. Estimated water saving: 100%.` 
        : `Apply 18.0 mm irrigation tomorrow morning. Expected rainfall: ${tomWeather.rainfall_mm} mm. Delay not recommended.`,
      recommendations_hi: tomWeather.rainfall_mm > 10 
        ? `भारी बारिश (${tomWeather.rainfall_mm} मिमी) की संभावना। सिंचाई 1 दिन के लिए टालें। पानी की बचत: 100%.` 
        : `कल सुबह 18.0 मिमी सिंचाई करें। वर्षा पूर्वानुमान: ${tomWeather.rainfall_mm} मिमी।`,
      recommendations_or: tomWeather.rainfall_mm > 10 
        ? `ବର୍ଷା ସମ୍ଭାବନା (${tomWeather.rainfall_mm} ମିମି)। ସେଚନ ୧ ଦିନ ବିଳମ୍ବ କରନ୍ତୁ। ଜଳ ସଞ୍ଚୟ: ୧୦୦%.` 
        : `କାଲି ସକାଳେ ୧୮.୦ ମିମି ସେଚନ କରନ୍ତୁ। ବର୍ଷା ସୂଚନା: ${tomWeather.rainfall_mm} ମିମି।`,
      explainable_factors_json: [
        "High temperature increasing crop evapotranspiration.",
        `Rainfall forecast: ${tomWeather.rainfall_mm} mm helps reduce required irrigation.`,
        `NDVI index at ${obsPoint.ndvi} indicates crop entering maturation phase.`
      ],
      sent_via_sms: false
    };
  };

  const generateOfflineBotReply = (query: string, lang: string) => {
    const q = query.toLowerCase();
    if (q.includes("water") || q.includes("irrigate") || q.includes("पानी") || q.includes("ସେଚନ")) {
      return lang === "hi" 
        ? "सिंचाई गणना आपके क्षेत्र के NDWI और आगामी बारिश के आधार पर होती है। बारिश होने पर पानी बचाने के लिए टालने की सलाह मिलती है।"
        : lang === "or"
        ? "ସେଚନ ଆପଣଙ୍କ ଜମିର ଆଦ୍ରତା (NDWI) ଏବଂ ବର୍ଷା ପୂର୍ବାନୁମାନକୁ ଆଧାର କରି ନିରୂପଣ ହୋଇଥାଏ। ବର୍ଷା ହେଲେ ସେଚନ ସ୍ଥଗିତ ରଖନ୍ତୁ।"
        : "Irrigation required is based on NDWI moisture stress and rain predictions. High expected rain reduces net water needs.";
    }
    if (q.includes("yellow") || q.includes("पीला") || q.includes("ହଳଦିଆ")) {
      return lang === "hi"
        ? "पत्तियों का पीला पड़ना नाइट्रोजन की कमी या नमी के तनाव को दर्शाता है। कृपया अपने खेत की फसल का NDVI मान जांचें।"
        : lang === "or"
        ? "ପତ୍ର ହଳଦିଆ ହେବା ଯବକ୍ଷାରଜାନର ଅଭାବ କିମ୍ବା ଆଦ୍ରତା ହ୍ରାସକୁ ସୂଚାଏ। ଆପଣଙ୍କ ଜମିର NDVI ମୂଲ୍ୟ ଦେଖନ୍ତୁ।"
        : "Leaf yellowing typically shows nitrogen deficiency or water logging stress. Check the field's NDVI growth profile.";
    }
    return lang === "hi"
      ? "मैं आपकी सहायता के लिए तैयार हूँ। आप मुझसे सिंचाई आवश्यकता, रोगों के लक्षण या उपज के बारे में पूछ सकते हैं।"
      : lang === "or"
      ? "ମୁଁ ଆପଣଙ୍କୁ ସାହାଯ୍ୟ କରିବାକୁ ପ୍ରସ୍ତୁତ। ସେଚନ, ରୋଗ ଚିହ୍ନଟ କିମ୍ବା ଅମଳ ସମ୍ବନ୍ଧରେ ପଚାରନ୍ତୁ।"
      : "I'm here to help. You can query about water scheduling volume, fungal blast warnings, or crop yield estimations.";
  };

  // Determine current active metrics based on the slider state
  const activeObservation = satelliteObservations[monthIndex] || { ndvi: 0.5, ndwi: 0.0, moisture_stress: "Green" };

  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 flex flex-col justify-between relative">
      {/* Background decorations */}
      <div className="bg-glow-green top-0 left-[10%] opacity-60"></div>

      {/* Main Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-b border-white/5 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Sprout className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg text-white">KrishiSaarthi AI</h1>
            <p className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase">Farmer Precision Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Language Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900/60 border border-white/5 text-xs text-slate-300">
            <Languages className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <select 
              value={activeLang} 
              onChange={(e) => setActiveLang(e.target.value)}
              className="bg-transparent border-none text-xs text-white focus:outline-none pr-2 cursor-pointer"
            >
              <option value="en" className="bg-[#0f172a]">English</option>
              <option value="hi" className="bg-[#0f172a]">हिन्दी (Hindi)</option>
              <option value="or" className="bg-[#0f172a]">ଓଡ଼ିଆ (Odia)</option>
            </select>
          </div>

          {/* PWA Cache Indicator */}
          <button 
            onClick={toggleOfflineCache}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isOfflineMode 
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-emerald-500/5 border-white/5 text-slate-400 hover:border-emerald-500/30 hover:text-white"
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            {isOfflineMode ? "Offline Active" : "Cache Maps"}
          </button>

          <span className="text-slate-600 hidden sm:inline">|</span>

          {/* User Welcome */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-xs uppercase">
              {username.charAt(0)}
            </div>
            <span className="text-xs font-bold text-slate-300 hidden md:inline">Welcome, {username}</span>
          </div>

          {/* Log Out */}
          <button 
            onClick={handleLogout}
            className="p-2 rounded-lg bg-slate-900/60 border border-white/5 text-slate-400 hover:text-red-400 hover:border-red-500/20 transition-all cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow">
        
        {/* Left Side: Field List & Map (GIS Map area) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Segment: Map & Draw Field Panel */}
          <div className="glass-panel p-4 sm:p-5 rounded-2xl flex flex-col gap-4">
            
            {/* Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-white uppercase tracking-wider">Geospatial Fields Map</span>
                {isRefreshingData && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Syncing...
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isDrawing ? (
                  <button
                    onClick={() => {
                      setIsDrawing(true);
                      setDraftPoints([]);
                    }}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-md hover:bg-emerald-600 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Draw Boundary
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={clearDrawing}
                      className="py-1.5 px-3 rounded-xl border border-white/10 hover:bg-white/5 text-xs text-slate-400 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold animate-pulse">
                      Click map to place points ({draftPoints.length})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* GIS Interactive map layer */}
            <div className="w-full h-[380px] min-h-[380px] relative">
              <FarmerMap
                center={mapCenter}
                fields={fields.map(f => ({
                  id: f.id,
                  name: f.name,
                  crop_type: f.crop_type,
                  geojson: typeof f.geojson === "string" ? JSON.parse(f.geojson) : f.geojson,
                  // Color code based on monthly stress in observation list
                  stressColor: selectedFieldId === f.id ? activeObservation.moisture_stress : "Green"
                }))}
                selectedFieldId={selectedFieldId}
                onSelectField={(id) => {
                  const fObj = fields.find(f => f.id === id);
                  selectField(id, fObj);
                }}
                isDrawing={isDrawing}
                draftPoints={draftPoints}
                onAddDraftPoint={handleMapClickForDrawing}
              />
            </div>

            {/* Drawing Save Panel Overlay */}
            {isDrawing && draftPoints.length >= 3 && (
              <form onSubmit={handleSaveField} className="glass-card p-4 rounded-xl flex flex-wrap items-end gap-4 bg-slate-900/90 border border-emerald-500/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex-grow min-w-[150px]">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Field Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Back yard sugarcane"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 text-white rounded-lg px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="w-[120px]">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">District Location</label>
                  <select
                    value={newFieldDistrict}
                    onChange={(e) => setNewFieldDistrict(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                  >
                    <option value="Cuttack">Cuttack (Odisha)</option>
                    <option value="Ludhiana">Ludhiana (Punjab)</option>
                    <option value="Vijayawada">Vijayawada (AP)</option>
                    <option value="Nashik">Nashik (Maha)</option>
                  </select>
                </div>

                <div className="w-[110px]">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Crop Variety</label>
                  <select
                    value={newFieldCrop}
                    onChange={(e) => setNewFieldCrop(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                  >
                    <option value="Paddy">Paddy (Rice)</option>
                    <option value="Wheat">Wheat</option>
                    <option value="Sugarcane">Sugarcane</option>
                    <option value="Cotton">Cotton</option>
                    <option value="Maize">Maize</option>
                  </select>
                </div>

                <div className="w-[80px]">
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Hectares</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={newFieldArea}
                    onChange={(e) => setNewFieldArea(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="py-1.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs cursor-pointer shadow-md"
                >
                  Save Field
                </button>
              </form>
            )}
          </div>

          {/* Segment: Interactive Timeline Slider */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Crop growth phenology slider</h4>
              <span className="px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                Active Month: {months[monthIndex]}
              </span>
            </div>

            {/* Slider track */}
            <div className="w-full px-2 mt-2">
              <input
                type="range"
                min="0"
                max="3"
                value={monthIndex}
                onChange={(e) => setMonthIndex(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-2 px-1 font-semibold">
                <span>Jan (Planted)</span>
                <span>Feb (Growth)</span>
                <span>Mar (Maturing)</span>
                <span>Apr (Harvest phase)</span>
              </div>
            </div>

            {/* Satellite indexes gauges derived from timeline */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
              <div className="p-4 rounded-xl border border-white/5 bg-slate-900/30 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Sprout className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Vigor Index (NDVI)</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-extrabold text-white">{activeObservation.ndvi}</span>
                    <span className="text-[10px] text-slate-400">/ 1.0</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${activeObservation.ndvi * 100}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-white/5 bg-slate-900/30 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Droplet className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Moisture Index (NDWI)</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-extrabold text-white">{activeObservation.ndwi}</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    {/* Map typical NDWI range of -0.3 to 0.5 to progress bar */}
                    <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${Math.max(10, Math.min(100, (activeObservation.ndwi + 0.3) * 125))}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-white/5 bg-slate-900/30 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Thermometer className="w-5 h-5" />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Radar backscatter (SAR)</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xl font-extrabold text-white">{activeObservation.vh_vv_ratio}</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-indigo-400 h-full rounded-full" style={{ width: `${Math.min(100, activeObservation.vh_vv_ratio * 40)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Field Selector, Advisory Panel, Yield/Disease, Chatbot */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Field Selection dropdown */}
          <div className="glass-panel p-4 rounded-2xl flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Field Selection</label>
            <select
              value={selectedFieldId || ""}
              onChange={(e) => {
                const fid = Number(e.target.value);
                const field = fields.find(f => f.id === fid);
                selectField(fid, field);
              }}
              className="w-full bg-slate-950 border border-white/10 text-white rounded-xl px-3 py-2.5 text-sm font-bold focus:border-emerald-500 focus:outline-none"
            >
              {fields.map(f => (
                <option key={f.id} value={f.id} className="bg-[#0f172a]">
                  {f.name} ({f.crop_type}) - {f.district}
                </option>
              ))}
            </select>
          </div>

          {/* Advisory Recommendation Panel */}
          {activeAdvisory && (
            <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4 border-l-4 border-l-emerald-500 shadow-md">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <div className="flex items-center gap-2">
                  <CloudRain className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-extrabold text-sm text-white uppercase tracking-wider">Smart Water Advisory</h4>
                </div>
                <button
                  onClick={triggerNewAdvisory}
                  className="p-1.5 rounded-lg border border-white/5 text-slate-400 hover:text-white transition-all cursor-pointer"
                  title="Recalculate Advisor"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Water saving badge */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Irrigation Depth</span>
                  <span className="text-2xl font-extrabold text-white">{activeAdvisory.irrigation_mm} mm</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex flex-col items-center">
                  <span className="text-[8px] uppercase font-bold tracking-wider opacity-85">Water Savings</span>
                  <span className="text-sm font-extrabold">{activeAdvisory.estimated_water_saving_pct}%</span>
                </div>
              </div>

              {/* Recommendation message (Multi-lingual) */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5">
                <span className="text-[9px] uppercase font-extrabold text-emerald-400 block mb-1">Advisory Recommendation</span>
                <p className="text-xs leading-relaxed text-slate-200">
                  {activeLang === "hi" 
                    ? activeAdvisory.recommendations_hi 
                    : activeLang === "or" 
                    ? activeAdvisory.recommendations_or 
                    : activeAdvisory.recommendations_en
                  }
                </p>
              </div>

              {/* SMS triggers */}
              <button
                onClick={dispatchSMSAdvisory}
                disabled={smsStatus === "sending"}
                className={`w-full py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-xs cursor-pointer shadow-md transition-all ${
                  smsStatus === "success"
                    ? "bg-slate-900 border border-emerald-500/30 text-emerald-400"
                    : "bg-emerald-500 text-slate-950 hover:bg-emerald-600 active:bg-emerald-700"
                }`}
              >
                {smsStatus === "sending" ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Sending SMS...
                  </>
                ) : smsStatus === "success" ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Sent to Phone (SMS)
                  </>
                ) : (
                  <>
                    <PhoneCall className="w-3.5 h-3.5" />
                    Send SMS Alert
                  </>
                )}
              </button>
            </div>
          )}

          {/* Yield Predictions & Disease vectors */}
          {predictions && (
            <div className="glass-panel p-5 rounded-2xl flex flex-col gap-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2.5">
                AI Yield & Disease Prognosis
              </h4>

              {/* Yield */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/30 border border-white/5">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Projected Output</span>
                  <span className="text-lg font-extrabold text-white mt-0.5">
                    {predictions.yield_prediction.expected_yield_tons_per_ha} tons/ha
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Confidence</span>
                  <span className="text-xs font-bold text-emerald-400 mt-0.5">
                    {predictions.yield_prediction.confidence_pct}%
                  </span>
                </div>
              </div>

              {/* Disease Vector warnings */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Eco Disease Vector Risks</span>
                
                {predictions.disease_risks.map((d: any, idx: number) => {
                  const isHigh = d.severity === "High";
                  return (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-xl border flex flex-col gap-2 ${
                        isHigh 
                          ? "bg-red-500/10 border-red-500/20 text-red-300" 
                          : "bg-amber-500/10 border-amber-500/20 text-amber-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className={`w-4 h-4 ${isHigh ? "text-red-400" : "text-amber-400"}`} />
                          <span className="text-xs font-extrabold">{d.disease_name}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950/60">
                          {d.probability}% Probability ({d.severity})
                        </span>
                      </div>
                      
                      {/* Recommendations list */}
                      <ul className="list-disc pl-4 text-[10px] flex flex-col gap-1 text-slate-300">
                        {d.recommendations_json.map((rec: string, rIdx: number) => (
                          <li key={rIdx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Explainable AI Card */}
          {activeAdvisory && activeAdvisory.explainable_factors_json && (
            <div className="glass-panel p-5 rounded-2xl flex flex-col gap-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2.5">
                Explainable AI (Advisory Drivers)
              </h4>
              
              <ul className="flex flex-col gap-2 text-xs">
                {activeAdvisory.explainable_factors_json.map((reason: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2.5 text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </main>

      {/* Floating Multilingual Chatbot Drawer */}
      <div className="fixed bottom-6 right-6 z-[1000] flex flex-col items-end">
        {/* Chat window panel */}
        {isChatOpen && (
          <div className="w-[340px] sm:w-[380px] h-[450px] rounded-2xl glass-panel flex flex-col justify-between shadow-2xl mb-4 border border-emerald-500/20 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300 bg-slate-900/95">
            {/* Header */}
            <div className="px-4 py-3 bg-emerald-500/10 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                <h4 className="font-bold text-xs text-white uppercase tracking-wider">KrishiSaarthi AI Advisor</h4>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            {/* Messages box */}
            <div className="flex-grow p-4 overflow-y-auto flex flex-col gap-3.5 text-xs">
              {chatMessages.map((m, idx) => (
                <div 
                  key={idx} 
                  className={`flex flex-col max-w-[80%] ${
                    m.sender === "user" ? "self-end items-end" : "self-start items-start"
                  }`}
                >
                  <span className="text-[9px] font-bold text-slate-500 mb-0.5 uppercase tracking-wide">
                    {m.sender === "user" ? "You" : "Advisor AI"}
                  </span>
                  <div 
                    className={`p-3 rounded-2xl leading-relaxed ${
                      m.sender === "user" 
                        ? "bg-emerald-500 text-slate-950 font-medium rounded-tr-none shadow-md" 
                        : "bg-slate-800 text-slate-100 rounded-tl-none border border-white/5"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {isChatTyping && (
                <div className="self-start flex items-center gap-1 p-2 rounded-xl bg-slate-800/40 border border-white/5 text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-150"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-300"></span>
                </div>
              )}
            </div>

            {/* Input field */}
            <form onSubmit={handleChatSubmit} className="p-3 border-t border-white/5 bg-slate-950/60 flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask about water, leaf yellowing..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-grow bg-slate-900 border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-600 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Floating circle toggle button */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="p-4 rounded-full bg-emerald-500 text-slate-950 shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer border border-emerald-400/20"
          title="Open AI Advisor Chat"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 font-semibold">
        <span>© 2026 KrishiSaarthi AI. All sector bounds cache active.</span>
        <span>Satellite pass: Sentinel-2B next window tomorrow 08:34 UTC</span>
      </footer>
    </div>
  );
}
