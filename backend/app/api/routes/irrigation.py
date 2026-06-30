from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import datetime
import json

from backend.app.db.session import get_db
from backend.app.models.models import Field, User, SatelliteObservation, IrrigationAdvisory
from backend.app.schemas.schemas import IrrigationAdvisoryResponse
from backend.app.api.routes.auth import get_current_user
from backend.app.services.weather_service import get_district_weather
from backend.app.services.satellite_service import fetch_or_create_satellite_observations
from backend.app.services.sms_service import send_sms_advisory
from backend.app.ml.inference import calculate_irrigation_requirement

router = APIRouter(prefix="/fields", tags=["irrigation"])

@router.post("/{field_id}/advisory", response_model=IrrigationAdvisoryResponse)
async def generate_irrigation_advisory(
    field_id: int,
    send_sms: bool = Query(False, description="Whether to dispatch recommendation to the farmer's registered phone number"),
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
        
    # Get latest satellite observations to know the NDVI health index
    obs = await fetch_or_create_satellite_observations(db, field.id, field.crop_type)
    latest_obs = obs[-1] if obs else None
    ndvi_val = latest_obs.ndvi if latest_obs else 0.6
    
    # Get weather forecast
    weather = await get_district_weather(db, field.district)
    tomorrow_weather = weather[1] if len(weather) > 1 else weather[0]
    
    # Compute evapotranspiration and forecast precipitation
    temp = tomorrow_weather["temp_c"]
    hum = tomorrow_weather["humidity_pct"]
    wind = tomorrow_weather["wind_kph"]
    
    # Next 36 hours rainfall (tomorrow + half of next day)
    forecast_rain = tomorrow_weather["rainfall_mm"]
    if len(weather) > 2:
        forecast_rain += weather[2]["rainfall_mm"] * 0.5
        
    advisory_data = calculate_irrigation_requirement(
        crop_type=field.crop_type,
        ndvi=ndvi_val,
        temp_c=temp,
        humidity_pct=hum,
        wind_kph=wind,
        forecast_rainfall_36h=forecast_rain
    )
    
    advisory_date = datetime.date.today()
    action_date = advisory_date + datetime.timedelta(days=1 + advisory_data["delay_days"])
    
    db_advisory = IrrigationAdvisory(
        field_id=field_id,
        advisory_date=advisory_date,
        irrigation_mm=advisory_data["irrigation_mm"],
        action_date=action_date,
        expected_rainfall_mm=round(forecast_rain, 1),
        estimated_water_saving_pct=advisory_data["water_saving_pct"],
        recommendations_en=advisory_data["recommendations"]["en"],
        recommendations_hi=advisory_data["recommendations"]["hi"],
        recommendations_or=advisory_data["recommendations"]["or"],
        explainable_factors_json=json.dumps(advisory_data["explainable_factors"]),
        sent_via_sms=False
    )
    
    db.add(db_advisory)
    await db.flush() # Flush to populate ID
    
    # Dispatch SMS if requested and user has phone number
    sent_sms_success = False
    if send_sms:
        # Determine notification language preference
        lang = current_user.language
        sms_text = ""
        if lang == "hi":
            sms_text = f"कृषिसारथी सलाह (खेत: {field.name}): {db_advisory.recommendations_hi}"
        elif lang == "or":
            sms_text = f"କୃଷିସାରଥୀ ପରାମର୍ଶ (ଜମି: {field.name}): {db_advisory.recommendations_or}"
        else:
            sms_text = f"KrishiSaarthi Advisory (Field: {field.name}): {db_advisory.recommendations_en}"
            
        # Get target phone number
        target_phone = current_user.phone_number
        if not target_phone:
            # Fallback check owner phone number
            if current_user.role == "government":
                owner_stmt = select(User).where(User.id == field.owner_id)
                owner_res = await db.execute(owner_stmt)
                owner_user = owner_res.scalar_one_or_none()
                if owner_user:
                    target_phone = owner_user.phone_number
                    
        if target_phone:
            sent_sms_success = await send_sms_advisory(target_phone, sms_text)
            if sent_sms_success:
                db_advisory.sent_via_sms = True
                await db.flush()
                
    return db_advisory

@router.get("/{field_id}/advisories", response_model=List[IrrigationAdvisoryResponse])
async def list_irrigation_advisories(
    field_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify field
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
        
    stmt_adv = select(IrrigationAdvisory).where(IrrigationAdvisory.field_id == field_id).order_by(IrrigationAdvisory.advisory_date.desc())
    res_adv = await db.execute(stmt_adv)
    advisories = res_adv.scalars().all()
    return list(advisories)
