from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from backend.app.db.session import get_db
from backend.app.models.models import Field, User
from backend.app.schemas.schemas import WeatherForecastResponse
from backend.app.api.routes.auth import get_current_user
from backend.app.services.weather_service import get_district_weather

router = APIRouter(prefix="/fields", tags=["weather"])

@router.get("/{field_id}/weather", response_model=List[WeatherForecastResponse])
async def get_field_weather_forecast(
    field_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify field
    from sqlalchemy import select
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
        
    weather = await get_district_weather(db, field.district)
    return weather
