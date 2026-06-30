from pydantic import BaseModel, Field, field_validator
from datetime import datetime, date
from typing import List, Optional, Dict, Any
import json

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

# User schemas
class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "farmer" # "farmer" or "government"
    phone_number: Optional[str] = None
    language: str = "en" # "en", "hi", "or"

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    phone_number: Optional[str] = None
    language: str

    class Config:
        from_attributes = True

# Field schemas
class FieldCreate(BaseModel):
    name: str
    district: str
    state: str
    crop_type: str # Wheat, Paddy, Maize, Cotton, Sugarcane
    area_hectares: float
    geojson: Dict[str, Any] # GeoJSON dictionary (e.g. Polygon coordinates)

class FieldResponse(BaseModel):
    id: int
    owner_id: int
    name: str
    district: str
    state: str
    crop_type: str
    area_hectares: float
    geojson: Dict[str, Any]
    created_at: datetime

    @field_validator("geojson", mode="before")
    @classmethod
    def parse_geojson(cls, value: Any) -> Dict[str, Any]:
        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception:
                return {}
        return value

    class Config:
        from_attributes = True

# Satellite Observation schemas
class SatelliteObservationResponse(BaseModel):
    id: int
    field_id: int
    acquisition_date: date
    ndvi: float
    ndwi: float
    vh_vv_ratio: float
    moisture_stress: str
    image_url: Optional[str] = None

    class Config:
        from_attributes = True

# Weather schemas
class WeatherForecastResponse(BaseModel):
    district: str
    forecast_date: date
    temp_c: float
    humidity_pct: float
    rainfall_mm: float
    wind_kph: float

    class Config:
        from_attributes = True

# Irrigation Advisory schemas
class IrrigationAdvisoryResponse(BaseModel):
    id: int
    field_id: int
    advisory_date: date
    irrigation_mm: float
    action_date: date
    expected_rainfall_mm: float
    estimated_water_saving_pct: float
    recommendations_en: str
    recommendations_hi: str
    recommendations_or: str
    explainable_factors_json: List[str]
    sent_via_sms: bool

    @field_validator("explainable_factors_json", mode="before")
    @classmethod
    def parse_explainable_factors(cls, value: Any) -> List[str]:
        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception:
                return []
        return value

    class Config:
        from_attributes = True

# Disease Risk schemas
class DiseaseRiskResponse(BaseModel):
    id: int
    field_id: int
    detection_date: date
    disease_name: str
    probability: float
    severity: str
    recommendations_json: List[str]

    @field_validator("recommendations_json", mode="before")
    @classmethod
    def parse_recommendations(cls, value: Any) -> List[str]:
        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception:
                return []
        return value

    class Config:
        from_attributes = True

# Chatbot schemas
class ChatRequest(BaseModel):
    message: str
    field_id: Optional[int] = None
    language: Optional[str] = None # en, hi, or

class ChatResponse(BaseModel):
    response: str
    language: str

# Government analytics schemas
class DistrictStats(BaseModel):
    district: str
    field_count: int
    total_area_hectares: float
    average_water_stress: float # 0 to 100
    irrigation_demand_m3: float
    projected_yield_tons: float
    crop_distribution: Dict[str, float] # crop -> total_area

class GovernmentDashboardResponse(BaseModel):
    districts: List[DistrictStats]
    critical_alerts: List[Dict[str, Any]]
