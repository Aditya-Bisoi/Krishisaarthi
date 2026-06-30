from datetime import date
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.app.models.models import SatelliteObservation
from backend.app.ml.inference import analyze_moisture_stress

async def fetch_or_create_satellite_observations(
    db: AsyncSession, 
    field_id: int, 
    crop_type: str
) -> List[SatelliteObservation]:
    """
    Retrieves or generates historical satellite observations (Jan - Apr) for a field.
    This simulates fetching optical (Sentinel-2) and SAR microwave (Sentinel-1) products.
    """
    stmt = select(SatelliteObservation).where(SatelliteObservation.field_id == field_id).order_by(SatelliteObservation.acquisition_date.asc())
    result = await db.execute(stmt)
    observations = result.scalars().all()
    
    if len(observations) >= 4:
        return list(observations)
        
    # Generate realistic crop growth trajectories (Jan - Apr)
    timeline = [
        {"month": 1, "day": 15},
        {"month": 2, "day": 15},
        {"month": 3, "day": 15},
        {"month": 4, "day": 15}
    ]
    
    # Crop-specific NDVI (vigor) and NDWI (moisture) profiles
    profiles = {
        "Wheat": {
            "ndvi": [0.25, 0.55, 0.78, 0.42],
            "ndwi": [-0.10, -0.05, -0.08, -0.22],
            "sar": [0.8, 1.2, 1.6, 1.1]
        },
        "Paddy": {
            "ndvi": [0.15, 0.38, 0.65, 0.82],
            "ndwi": [0.45, 0.32, 0.12, 0.05], # High flooding index in early stages
            "sar": [0.6, 0.9, 1.3, 1.7]
        },
        "Maize": {
            "ndvi": [0.28, 0.52, 0.72, 0.50],
            "ndwi": [-0.05, 0.02, -0.04, -0.15],
            "sar": [0.7, 1.1, 1.4, 1.0]
        },
        "Sugarcane": {
            "ndvi": [0.60, 0.68, 0.74, 0.71], # Perennial, high greenness
            "ndwi": [0.08, 0.10, 0.05, 0.02],
            "sar": [1.5, 1.8, 2.0, 1.9]
        },
        "Cotton": {
            "ndvi": [0.22, 0.44, 0.62, 0.48],
            "ndwi": [-0.15, -0.10, -0.12, -0.20],
            "sar": [0.5, 0.8, 1.2, 0.9]
        }
    }
    
    profile = profiles.get(crop_type, profiles["Paddy"])
    
    generated_obs = []
    for idx, time_point in enumerate(timeline):
        obs_date = date(2026, time_point["month"], time_point["day"])
        
        ndvi = profile["ndvi"][idx]
        ndwi = profile["ndwi"][idx]
        sar = profile["sar"][idx]
        
        # Simulate dry days and temp to introduce dynamic stress in later stages (e.g. March/April)
        consecutive_dry_days = 0
        temp_c = 28.0
        
        if time_point["month"] == 3: # Peak summer heat beginning
            consecutive_dry_days = 6
            temp_c = 34.0
            ndwi -= 0.08 # dry out
        elif time_point["month"] == 4:
            consecutive_dry_days = 10
            temp_c = 39.0
            ndwi -= 0.15 # severe dry out
            
        stress_status, _, _ = analyze_moisture_stress(ndvi, ndwi, temp_c, consecutive_dry_days)
        
        # Visual mock image URL indicating crop growth stage representation
        image_url = f"/images/satellite/{crop_type.lower()}_month_{time_point['month']}.png"
        
        db_obs = SatelliteObservation(
            field_id=field_id,
            acquisition_date=obs_date,
            ndvi=round(ndvi, 3),
            ndwi=round(ndwi, 3),
            vh_vv_ratio=round(sar, 3),
            moisture_stress=stress_status,
            image_url=image_url
        )
        db.add(db_obs)
        generated_obs.append(db_obs)
        
    await db.flush()
    return generated_obs
