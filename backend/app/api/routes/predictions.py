from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any

from backend.app.db.session import get_db
from backend.app.models.models import Field, User, SatelliteObservation, DiseaseRisk
from backend.app.schemas.schemas import DiseaseRiskResponse
from backend.app.api.routes.auth import get_current_user
from backend.app.services.satellite_service import fetch_or_create_satellite_observations
from backend.app.services.weather_service import get_district_weather
from backend.app.ml.inference import classify_crop_type, predict_yield_and_confidence, evaluate_disease_risks
import json
import datetime

router = APIRouter(prefix="/fields", tags=["predictions"])

@router.get("/{field_id}/predictions")
async def get_field_predictions(
    field_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Field).where(Field.id == field_id)
    result = await db.execute(stmt)
    field = result.scalar_one_or_none()
    
    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found"
        )
        
    if current_user.role != "government" and field.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this field"
        )
        
    # Get satellite timeline
    obs = await fetch_or_create_satellite_observations(db, field.id, field.crop_type)
    ndvi_history = [o.ndvi for o in obs]
    ndwi_history = [o.ndwi for o in obs]
    sar_history = [o.vh_vv_ratio for o in obs]
    
    # AI Crop classification
    pred_crop, crop_conf = classify_crop_type(ndvi_history, ndwi_history, sar_history)
    
    # Yield prediction
    expected_yield, yield_conf = predict_yield_and_confidence(field.crop_type, ndvi_history)
    
    # Fetch current weather to compute disease risk
    weather = await get_district_weather(db, field.district)
    avg_temp = sum([w["temp_c"] for w in weather]) / (len(weather) or 1)
    avg_hum = sum([w["humidity_pct"] for w in weather]) / (len(weather) or 1)
    
    # Predict diseases
    disease_list = evaluate_disease_risks(field.crop_type, avg_temp, avg_hum)
    
    # Store or update disease risks in database for tracking
    # Delete old disease records first
    await db.execute(
        DiseaseRisk.__table__.delete().where(DiseaseRisk.field_id == field_id)
    )
    
    saved_diseases = []
    for d in disease_list:
        db_disease = DiseaseRisk(
            field_id=field_id,
            detection_date=datetime.date.today(),
            disease_name=d["disease_name"],
            probability=d["probability"],
            severity=d["severity"],
            recommendations_json=json.dumps(d["recommendations"])
        )
        db.add(db_disease)
        await db.flush()
        
        saved_diseases.append({
            "id": db_disease.id,
            "field_id": db_disease.field_id,
            "detection_date": db_disease.detection_date,
            "disease_name": db_disease.disease_name,
            "probability": db_disease.probability,
            "severity": db_disease.severity,
            "recommendations_json": d["recommendations"]
        })
        
    return {
        "crop_identification": {
            "registered_crop": field.crop_type,
            "detected_crop": pred_crop,
            "confidence": crop_conf
        },
        "yield_prediction": {
            "expected_yield_tons_per_ha": expected_yield,
            "confidence_pct": yield_conf
        },
        "disease_risks": saved_diseases
    }
