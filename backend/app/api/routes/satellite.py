from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from backend.app.db.session import get_db
from backend.app.models.models import Field, User
from backend.app.schemas.schemas import SatelliteObservationResponse
from backend.app.api.routes.auth import get_current_user
from backend.app.services.satellite_service import fetch_or_create_satellite_observations

router = APIRouter(prefix="/fields", tags=["satellite"])

@router.get("/{field_id}/satellite", response_model=List[SatelliteObservationResponse])
async def get_field_satellite_data(
    field_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify field access
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
        
    obs = await fetch_or_create_satellite_observations(db, field.id, field.crop_type)
    return obs
