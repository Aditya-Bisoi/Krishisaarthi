from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import json

from backend.app.db.session import get_db
from backend.app.models.models import Field, User
from backend.app.schemas.schemas import FieldCreate, FieldResponse
from backend.app.api.routes.auth import get_current_user
from backend.app.services.satellite_service import fetch_or_create_satellite_observations

router = APIRouter(prefix="/fields", tags=["fields"])

@router.post("", response_model=FieldResponse)
async def create_field(
    field_in: FieldCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    geojson_str = json.dumps(field_in.geojson)
    
    db_field = Field(
        owner_id=current_user.id,
        name=field_in.name,
        district=field_in.district,
        state=field_in.state,
        crop_type=field_in.crop_type,
        area_hectares=field_in.area_hectares,
        geojson=geojson_str
    )
    db.add(db_field)
    await db.flush() # Flush to get field ID
    
    # Pre-generate satellite observations for timeline exploration
    await fetch_or_create_satellite_observations(db, db_field.id, db_field.crop_type)
    
    return db_field

@router.get("", response_model=List[FieldResponse])
async def list_fields(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # If the user is government role, let them list all fields to view aggregate data.
    # Otherwise, return only their fields.
    if current_user.role == "government":
        stmt = select(Field)
    else:
        stmt = select(Field).where(Field.owner_id == current_user.id)
        
    result = await db.execute(stmt)
    fields = result.scalars().all()
    return list(fields)

@router.get("/{field_id}", response_model=FieldResponse)
async def get_field(
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
        
    return field
