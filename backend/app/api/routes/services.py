"""Service categories API."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.booking import ServiceCategory
from app.schemas.auth import APIResponse

router = APIRouter()


@router.get("", response_model=APIResponse)
async def get_services(db: AsyncSession = Depends(get_db)):
    """Get all active service categories."""
    result = await db.execute(
        select(ServiceCategory).where(ServiceCategory.is_active == True).order_by(ServiceCategory.sort_order)
    )
    categories = result.scalars().all()

    return APIResponse(
        success=True,
        message="Service categories retrieved",
        data={
            "categories": [{
                "id": c.id,
                "name": c.name,
                "slug": c.slug,
                "description": c.description,
                "icon": c.icon,
                "image_url": c.image_url,
                "base_hourly_rate": float(c.base_hourly_rate),
                "reservation_fee": float(c.reservation_fee),
                "emergency_fee": float(c.emergency_fee),
            } for c in categories]
        },
    )
