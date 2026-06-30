from typing import List, Dict, Any, Tuple
import numpy as np

def classify_crop_type(ndvi_history: List[float], ndwi_history: List[float], sar_history: List[float]) -> Tuple[str, float]:
    """
    Simulates classifying a crop type based on historical satellite observations (NDVI, NDWI, SAR).
    Returns (crop_type, confidence)
    """
    if not ndvi_history or not ndwi_history or not sar_history:
        return "Paddy", 0.85
        
    avg_ndvi = sum(ndvi_history) / len(ndvi_history)
    avg_ndwi = sum(ndwi_history) / len(ndwi_history)
    avg_sar = sum(sar_history) / len(sar_history)
    
    # Simple rule-based/decision tree classifier simulating satellite classification
    # 1. Sugarcane: high biomass, perennial, very high SAR (backscatter)
    if avg_sar > 1.8 and avg_ndvi > 0.6:
        return "Sugarcane", 0.92
    
    # 2. Paddy: starts with high flooding (high NDWI in early growth), then high NDVI
    first_half_ndwi = sum(ndwi_history[:len(ndwi_history)//2]) / (len(ndwi_history)//2 or 1)
    if first_half_ndwi > 0.15:
        return "Paddy", 0.89
        
    # 3. Wheat: standard rabi crop, high NDVI peak, low NDWI
    if avg_ndvi > 0.55 and avg_ndwi < -0.1:
        return "Wheat", 0.91
        
    # 4. Maize: moderate NDVI, low-to-medium SAR
    if avg_ndvi > 0.4 and avg_sar > 1.2:
        return "Maize", 0.87
        
    # 5. Cotton: moderate NDVI, low NDWI
    return "Cotton", 0.84

def analyze_moisture_stress(ndvi: float, ndwi: float, temp_c: float, consecutive_dry_days: int) -> Tuple[str, float, Dict[str, float]]:
    """
    Calculates moisture stress index (0-100) and returns status (Green, Yellow, Red) along with feature importances.
    """
    # High temp, low NDWI (water index), high dry days increase stress
    # NDWI ranges typically from -1 to 1. Positive means high water content, negative means dry/soil.
    ndwi_score = max(0, min(100, (0.2 - ndwi) * 200)) # lower NDWI -> higher score
    temp_score = max(0, min(100, (temp_c - 20) * 4)) # higher temp -> higher score
    dry_score = min(100, consecutive_dry_days * 8)
    
    # Base stress calculated from indexes
    stress_score = (ndwi_score * 0.4) + (temp_score * 0.3) + (dry_score * 0.3)
    stress_score = round(max(0.0, min(100.0, stress_score)), 1)
    
    if stress_score < 35:
        status = "Green"
    elif stress_score < 65:
        status = "Yellow"
    else:
        status = "Red"
        
    # Feature importances for Explainable AI
    total_raw = ndwi_score + temp_score + dry_score
    if total_raw == 0:
        importances = {"Soil Moisture Deficit (NDWI)": 0.4, "Temperature Factor": 0.3, "Lack of Rainfall": 0.3}
    else:
        importances = {
            "Soil Moisture Deficit (NDWI)": round(ndwi_score / total_raw, 2),
            "Temperature Factor": round(temp_score / total_raw, 2),
            "Lack of Rainfall": round(dry_score / total_raw, 2)
        }
        
    return status, stress_score, importances

def calculate_irrigation_requirement(
    crop_type: str, 
    ndvi: float, 
    temp_c: float, 
    humidity_pct: float, 
    wind_kph: float, 
    forecast_rainfall_36h: float
) -> Dict[str, Any]:
    """
    Fuses weather and crop properties to generate rain-aware irrigation advisories.
    Returns advisory dict.
    """
    # Crop coefficient Kc
    kc_map = {
        "Wheat": 0.85,
        "Paddy": 1.15,
        "Maize": 0.80,
        "Sugarcane": 1.20,
        "Cotton": 0.75
    }
    kc = kc_map.get(crop_type, 0.85)
    
    # Simple Hargreaves-like reference evapotranspiration (ETo) approximation in mm/day
    eto = 0.0023 * (temp_c + 17.8) * ((temp_c * 0.4)**0.5) * (1 + (wind_kph / 100)) * (100 - humidity_pct) / 20
    eto = max(2.0, min(10.0, eto))
    
    # Daily crop water requirement (ETc) in mm
    etc = eto * kc
    
    # We plan for a 3-day irrigation cycle
    base_irrigation = etc * 3
    
    # Rain-aware irrigation reduction
    effective_rainfall = min(base_irrigation, forecast_rainfall_36h * 0.75)
    net_irrigation = max(0.0, base_irrigation - effective_rainfall)
    
    # Action and estimated water saving
    water_saving_pct = 0.0
    if forecast_rainfall_36h > 0:
        water_saving_pct = round((effective_rainfall / base_irrigation) * 100, 1)
        
    delay_days = 0
    if forecast_rainfall_36h >= 10:
        delay_days = 1 if forecast_rainfall_36h < 25 else 2
        
    net_irrigation = round(net_irrigation, 1)
    
    # Formulate localized multi-lingual recommendations
    if net_irrigation == 0:
        rec_en = f"Delay irrigation by {delay_days} day(s). Expected rainfall: {forecast_rainfall_36h:.1f} mm within 36 hours. Estimated water saving: 100%."
        rec_hi = f"सिंचाई को {delay_days} दिन टालें। अगले 36 घंटों में {forecast_rainfall_36h:.1f} मिमी बारिश की उम्मीद है। अनुमानित पानी की बचत: 100%।"
        rec_or = f"ସେଚନକୁ {delay_days} ଦିନ ବିଳମ୍ବ କରନ୍ତୁ। ଆଗାମୀ 36 ଘଣ୍ଟା ମଧ୍ୟରେ {forecast_rainfall_36h:.1f} ମିମି ବର୍ଷା ସମ୍ଭାବନା। ଆନୁମାନିକ ଜଳ ସଞ୍ଚୟ: 100%।"
    elif delay_days > 0:
        rec_en = f"Apply {net_irrigation:.1f} mm irrigation after {delay_days} day(s). Expected rainfall: {forecast_rainfall_36h:.1f} mm. Estimated water saving: {water_saving_pct:.1f}%."
        rec_hi = f"{delay_days} दिन बाद {net_irrigation:.1f} मिमी सिंचाई करें। अपेक्षित वर्षा: {forecast_rainfall_36h:.1f} मिमी। अनुमानित पानी की बचत: {water_saving_pct:.1f}%।"
        rec_or = f"{delay_days} ଦିନ ପରେ {net_irrigation:.1f} ମିମି ସେଚନ କରନ୍ତୁ। ଆଶା କରାଯାଉଥିବା ବର୍ଷା: {forecast_rainfall_36h:.1f} ମିମି। ଆନୁମାନିକ ଜଳ ସଞ୍ଚୟ: {water_saving_pct:.1f}%।"
    else:
        rec_en = f"Apply {net_irrigation:.1f} mm irrigation tomorrow morning. Expected rainfall: {forecast_rainfall_36h:.1f} mm. Delay not recommended."
        rec_hi = f"कल सुबह {net_irrigation:.1f} मिमी सिंचाई करें। अपेक्षित वर्षा: {forecast_rainfall_36h:.1f} मिमी। टालने की सलाह नहीं है।"
        rec_or = f"କାଲି ସକାଳେ {net_irrigation:.1f} ମିମି ସେଚନ କରନ୍ତୁ। ଆଶା କରାଯାଉଥିବା ବର୍ଷା: {forecast_rainfall_36h:.1f} ମିମି। ସେଚନ ବିଳମ୍ବ କରିବା ଅନୁଚିତ।"

    # Generate explainable reasons
    reasons = []
    if temp_c > 32:
        reasons.append(f"High temperature ({temp_c:.1f}°C) increases crop evaporation rates.")
    if humidity_pct < 45:
        reasons.append(f"Dry air conditions (Humidity: {humidity_pct:.1f}%) speed up soil dry out.")
    if ndvi < 0.5:
        reasons.append("NDVI value is below optimal curve, suggesting moisture distress.")
    if forecast_rainfall_36h > 5:
        reasons.append(f"Upcoming forecast rainfall of {forecast_rainfall_36h:.1f} mm reduces irrigation requirements.")
    else:
        reasons.append("No significant rainfall forecasted in the next 36 hours.")
        
    return {
        "irrigation_mm": net_irrigation,
        "delay_days": delay_days,
        "water_saving_pct": water_saving_pct,
        "recommendations": {
            "en": rec_en,
            "hi": rec_hi,
            "or": rec_or
        },
        "explainable_factors": reasons
    }

def predict_yield_and_confidence(crop_type: str, ndvi_history: List[float]) -> Tuple[float, float]:
    """
    Predicts yield in tons/hectare and confidence % based on NDVI cumulative performance.
    """
    if not ndvi_history:
        return 0.0, 0.0
        
    avg_ndvi = sum(ndvi_history) / len(ndvi_history)
    
    # Potential yield (tons/hectare) for average conditions in India
    potential_yields = {
        "Wheat": 6.2,
        "Paddy": 5.8,
        "Maize": 5.2,
        "Sugarcane": 85.0,
        "Cotton": 2.8
    }
    
    potential = potential_yields.get(crop_type, 5.0)
    
    # Yield scale based on NDVI (health indicator)
    # NDVI normally peaks around 0.7-0.8 for healthy crops
    yield_multiplier = max(0.6, min(1.1, avg_ndvi / 0.65))
    predicted_yield = round(potential * yield_multiplier, 2)
    
    # Confidence grows with more satellite data points
    num_samples = len(ndvi_history)
    confidence = min(95.0, 70.0 + (num_samples * 2.5))
    
    return predicted_yield, round(confidence, 1)

def evaluate_disease_risks(crop_type: str, temp_c: float, humidity_pct: float) -> List[Dict[str, Any]]:
    """
    Evaluates probability and severity of disease infections based on weather thresholds.
    """
    risks = []
    
    # Paddy - Blast Disease (High humidity >85%, Temp 25-28C)
    if crop_type == "Paddy":
        prob = 0.0
        if humidity_pct > 80:
            prob += (humidity_pct - 80) * 4 # Up to 80% from humidity
        if 22 <= temp_c <= 30:
            prob += 20
            
        prob = round(min(95.0, prob), 1)
        if prob > 40:
            severity = "High" if prob > 70 else "Medium"
            recs = [
                "Apply recommended fungicide (e.g., Tricyclazole) if early lesions appear.",
                "Maintain thin water layer in paddy fields to reduce spore transmission.",
                "Avoid excessive nitrogenous fertilizer application."
            ]
            risks.append({
                "disease_name": "Rice Blast Fungus",
                "probability": prob,
                "severity": severity,
                "recommendations": recs
            })
            
    # Wheat - Stripe Rust (High humidity >75%, Temp 15-22C)
    elif crop_type == "Wheat":
        prob = 0.0
        if humidity_pct > 70:
            prob += (humidity_pct - 70) * 3
        if 12 <= temp_c <= 22:
            prob += 25
            
        prob = round(min(90.0, prob), 1)
        if prob > 40:
            severity = "High" if prob > 68 else "Medium"
            recs = [
                "Monitor lower leaves for yellow-orange pustules daily.",
                "Spray propiconazole at 0.1% concentration upon detection.",
                "Sow rust-resistant wheat varieties in next cycle."
            ]
            risks.append({
                "disease_name": "Wheat Stripe Rust",
                "probability": prob,
                "severity": severity,
                "recommendations": recs
            })

    # Maize - Leaf Blight (Humidity > 80%, Temp 20-30C)
    elif crop_type == "Maize":
        prob = 0.0
        if humidity_pct > 75:
            prob += (humidity_pct - 75) * 3
        if 20 <= temp_c <= 32:
            prob += 20
            
        prob = round(min(88.0, prob), 1)
        if prob > 40:
            severity = "High" if prob > 70 else "Medium"
            recs = [
                "Ensure proper drainage to keep humidity under check.",
                "Use Mancozeb spray to limit leaf spot extensions.",
                "Remove and burn infected crop residues after harvest."
            ]
            risks.append({
                "disease_name": "Northern Leaf Blight",
                "probability": prob,
                "severity": severity,
                "recommendations": recs
            })

    # Cotton - Leaf Curl (High temp + whitefly presence)
    elif crop_type == "Cotton":
        prob = 0.0
        if temp_c > 30 and humidity_pct > 65:
            prob = round(min(85.0, 30 + (temp_c - 30)*5 + (humidity_pct - 65)), 1)
            
        if prob > 40:
            severity = "High" if prob > 70 else "Medium"
            recs = [
                "Control vector Whiteflies using neem oil or insecticidal sprays.",
                "Uproot and destroy affected weeds around the field boundary.",
                "Do not grow cotton in fields bordering other vector hosts."
            ]
            risks.append({
                "disease_name": "Cotton Leaf Curl Virus",
                "probability": prob,
                "severity": severity,
                "recommendations": recs
            })

    # General crop disease (simulated fallback)
    if not risks:
        # Lower probability standard disease
        risks.append({
            "disease_name": "Root Rot / Fungal Decay",
            "probability": round(humidity_pct * 0.3, 1),
            "severity": "Low",
            "recommendations": [
                "Avoid over-watering to avoid waterlogging.",
                "Ensure soil aeration through proper weeding."
            ]
        })
        
    return risks
