# KrishiSaarthi AI - Precision Agriculture Platform

KrishiSaarthi AI is an AI-powered Precision Agriculture Platform that combines satellite observations, forecast weather parameters, soil characteristics, and crop phenology curves to deliver localized, rain-aware irrigation advisories, crop type classifications, yield projections, disease vector warnings, and multi-lingual chatbot assistants (English, Hindi, Odia).

---

## 🚀 Key Features

* **🛰️ GIS Interactive Map & Custom Polygon Drawing:** Interactive Leaflet GIS maps displaying field boundaries color-coded by crop stress. Farmers can draw custom boundaries directly on the map to register new fields.
* **📈 Phenology Slider Timeline:** Slide across the crop growth timeline (January $\rightarrow$ April) to watch indices (NDVI, NDWI, SAR ratios) evolve, updating health and map visuals.
* **💧 Rain-Aware Smart Irrigation advisories:** Advises precise irrigation depths in `mm` by calculating evapotranspiration and forecast precipitation, helping farmers save up to 25% water.
* **🚨 Environmental Disease Vector Warnings:** Analyzes weather temperature and humidity thresholds to output risk probabilities and preventative actions for fungal infections like Rice Blast and Stripe Rust.
* **💬 Multilingual AI Conversational Advisor:** Floating chatbot helper providing detailed agricultural suggestions (yellow leaves, water volumes) in Hindi, Odia, or English.
* **📱 SMS Advisory logs fallback:** Sends out notifications using Twilio APIs. If Twilio keys are not configured, it writes dispatches to a local logger `sms_delivery.log` in the workspace directory.
* **📊 Government Analytics Command Center:** District-level dashboard monitoring total Monitored Area, Average Water Stress Index, canal irrigation discharge demands, district alerts, and Chart.js graphical aggregates.
* **⚙️ Zero-Config Database Fallback:** Detects PostgreSQL with PostGIS configurations, but automatically falls back to an SQLite async database (`krishisaarthi.db`) with JSON boundaries serialization for plug-and-play local development.

---

## 🛠️ Tech Stack

### Backend
* **FastAPI (Python):** REST APIs, auth handling, CORS.
* **SQLAlchemy & aiosqlite:** Async SQLite/PostgreSQL connection.
* **NumPy:** Evapotranspiration hargreaves indices and Phenological models.
* **Uvicorn:** ASGI Server.

### Frontend
* **Next.js 15 (React):** App Router structure, client-side renders, static prerenders.
* **Tailwind CSS v4:** Curated dark theme, glassmorphic panels, and animated stress pulses.
* **Leaflet & React-Leaflet:** GIS Map polygon overlays and circle anchors.
* **Chart.js & React-Chartjs-2:** Doughnut, Bar, and Line analytics widgets.
* **Lucide React:** Icon sets.

---

## 📂 Project Structure

```
c:\Users\ASUS\Downloads\krishisaarthi\
├── backend\
│   └── app\
│       ├── api\
│       │   └── routes\       ← API endpoints (auth, fields, chatbot, etc.)
│       ├── core\             ← Security, JWT tokens, Pydantic settings config
│       ├── db\               ← Session maker (Postgres/SQLite engine fallback)
│       ├── ml\               ← Crop classifications, evapotranspiration math
│       ├── models\           ← SQLAlchemy models
│       ├── schemas\          ← Pydantic schemas
│       ├── services\         ← Weather service cache, Twilio SMS service
│       └── main.py           ← FastAPI entrypoint & table creation on startup
├── frontend\
│   ├── src\
│   │   ├── app\
│   │   │   ├── farmer\       ← Farmer dashboard page layout
│   │   │   ├── government\   ← Government dashboard page layout
│   │   │   ├── globals.css   ← Styles, glassmorphic panels, Leaflet dark map
│   │   │   └── page.tsx      ← Landing entry portal with demo logins
│   │   └── components\
│   │       ├── FarmerMap.tsx     ← GIS Leaflet map client component
│   │       └── GovernmentMap.tsx ← Choropleth marker grid map
│   ├── public\
│   │   └── manifest.json     ← PWA Manifest orientations
│   └── package.json
├── verify_backend.py         ← Backend integration testing suite
├── sms_delivery.log          ← Simulated SMS dispatch outputs
└── README.md
```

---

## 💻 Local Setup & Running Instructions

### 1. Launch Backend API Services
The backend relies on the virtual environment `venv` in your workspace directory.

1. Open a PowerShell command prompt in the workspace directory.
2. Launch the backend FastAPI server:
   ```powershell
   .\venv\Scripts\python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
   ```
3. Verify the server is running by opening the Swagger UI: **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**

*(Note: On startup, the server checks for PostgreSQL and falls back to SQLite, auto-generating the SQLite database file `krishisaarthi.db` in your root workspace folder).*

### 2. Launch Frontend Dev Server
1. Open a new command prompt and navigate to the `frontend/` folder:
   ```bash
   cd frontend
   ```
2. Start the Next.js development client:
   ```bash
   npm run dev
   ```
3. Open your browser and navigate to: **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 How to Log In & Demo Access

The platform provides a dual portal authentication gate (Farmer vs. Government). You can enter either through creating real database credentials or by using the pre-programmed **Demo Access** buttons.

### Method A: Quick Demo Access (Recommended)
On the landing page card, click on either of the two buttons under the **"Demo Access"** section:
* **Farmer Portal Button:** Automatically log in as `farmer_krishan`. It centers the GIS map on Odisha Paddy fields, loads pre-calculated satellite Phenologies, and triggers Hindi/Odia chatbot configurations.
* **Government Button:** Log in as `gov_officer_orissa`. Immediately directs you to district-level stress models, alerts, and Chart.js graphs.

### Method B: Registering a New Account
1. On the landing page login card, select the **Farmer** or **Government** role tab.
2. In the username and password fields, input your desired account credentials.
3. If the backend is running, it will automatically register the account on the fly and log you in.
4. Alternatively, register new accounts by using the backend Swagger docs registration endpoint `/api/auth/register`.

---

## 🧪 Integration Verification Testing

You can verify that all API routers (User registrations, JWT logins, GIS field additions, satellite observations queries, smart water calculations, yield predictions, and chatbot responses) are active by running our verification test runner.

With the FastAPI server running on port 8000, run:
```powershell
.\venv\Scripts\python verify_backend.py
```
A successful run returns:
`=== ALL ENDPOINTS VERIFIED SUCCESSFULLY ===`
