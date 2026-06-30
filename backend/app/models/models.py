from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date, Boolean, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="farmer") # "farmer" or "government"
    phone_number = Column(String, nullable=True)
    language = Column(String, default="en") # "en", "hi", "or"

    # Relationships
    fields = relationship("Field", back_populates="owner", cascade="all, delete-orphan")

class Field(Base):
    __tablename__ = "fields"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    district = Column(String, nullable=False)
    state = Column(String, nullable=False)
    crop_type = Column(String, nullable=False) # Wheat, Paddy, Maize, Cotton, Sugarcane
    area_hectares = Column(Float, nullable=False)
    geojson = Column(String, nullable=False) # JSON coordinate string of polygon geometry
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="fields")
    satellite_observations = relationship("SatelliteObservation", back_populates="field", cascade="all, delete-orphan")
    irrigation_advisories = relationship("IrrigationAdvisory", back_populates="field", cascade="all, delete-orphan")
    disease_risks = relationship("DiseaseRisk", back_populates="field", cascade="all, delete-orphan")

class SatelliteObservation(Base):
    __tablename__ = "satellite_observations"

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id", ondelete="CASCADE"), nullable=False)
    acquisition_date = Column(Date, nullable=False)
    ndvi = Column(Float, nullable=False)
    ndwi = Column(Float, nullable=False)
    vh_vv_ratio = Column(Float, nullable=False) # SAR proxy for biomass/moisture
    moisture_stress = Column(String, nullable=False) # Green, Yellow, Red
    image_url = Column(String, nullable=True)

    # Relationships
    field = relationship("Field", back_populates="satellite_observations")

class WeatherForecast(Base):
    __tablename__ = "weather_forecasts"

    id = Column(Integer, primary_key=True, index=True)
    district = Column(String, index=True, nullable=False)
    forecast_date = Column(Date, nullable=False)
    temp_c = Column(Float, nullable=False)
    humidity_pct = Column(Float, nullable=False)
    rainfall_mm = Column(Float, nullable=False)
    wind_kph = Column(Float, nullable=False)

class IrrigationAdvisory(Base):
    __tablename__ = "irrigation_advisories"

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id", ondelete="CASCADE"), nullable=False)
    advisory_date = Column(Date, nullable=False)
    irrigation_mm = Column(Float, nullable=False)
    action_date = Column(Date, nullable=False)
    expected_rainfall_mm = Column(Float, nullable=False)
    estimated_water_saving_pct = Column(Float, nullable=False)
    recommendations_en = Column(String, nullable=False)
    recommendations_hi = Column(String, nullable=False)
    recommendations_or = Column(String, nullable=False)
    explainable_factors_json = Column(String, nullable=False) # JSON list of explanation strings
    sent_via_sms = Column(Boolean, default=False)

    # Relationships
    field = relationship("Field", back_populates="irrigation_advisories")

class DiseaseRisk(Base):
    __tablename__ = "disease_risks"

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id", ondelete="CASCADE"), nullable=False)
    detection_date = Column(Date, nullable=False)
    disease_name = Column(String, nullable=False)
    probability = Column(Float, nullable=False) # 0 to 100
    severity = Column(String, nullable=False) # Low, Medium, High
    recommendations_json = Column(String, nullable=False) # JSON list of prevention/treatment steps

    # Relationships
    field = relationship("Field", back_populates="disease_risks")
