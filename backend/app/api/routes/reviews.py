"""Reviews and ratings API routes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from pydantic import BaseModel, Field
from typing import Optional, List

from app.db.session import get_db
from app.api.deps import require_customer, get_current_user
from app.models.user import User
from app.models.booking import Booking, BookingStatus
from app.models.review import Review, ReviewStatus, ReviewPhoto
from app.schemas.auth import APIResponse

router = APIRouter()


class CreateReviewRequest(BaseModel):
    booking_id: int
    overall_rating: float = Field(..., ge=1, le=5)
    professionalism_rating: Optional[float] = Field(None, ge=1, le=5)
    communication_rating: Optional[float] = Field(None, ge=1, le=5)
    service_quality_rating: Optional[float] = Field(None, ge=1, le=5)
    timeliness_rating: Optional[float] = Field(None, ge=1, le=5)
    review_text: Optional[str] = None
    would_recommend: Optional[bool] = None
    photo_urls: Optional[List[dict]] = None


@router.post("/reviews", response_model=APIResponse)
async def create_review(
    request: CreateReviewRequest,
    user: User = Depends(require_customer),
    db: AsyncSession = Depends(get_db),
):
    """Submit a review for a completed booking."""
    # Validate booking
    booking_result = await db.execute(
        select(Booking).where(
            Booking.id == request.booking_id,
            Booking.customer_id == user.id,
            Booking.status == BookingStatus.COMPLETED,
        )
    )
    booking = booking_result.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Completed booking not found")

    # Check for existing review
    existing = await db.execute(
        select(Review).where(Review.booking_id == request.booking_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Review already submitted for this booking")

    review = Review(
        booking_id=request.booking_id,
        customer_id=user.id,
        provider_id=booking.provider_id,
        overall_rating=request.overall_rating,
        professionalism_rating=request.professionalism_rating,
        communication_rating=request.communication_rating,
        service_quality_rating=request.service_quality_rating,
        timeliness_rating=request.timeliness_rating,
        review_text=request.review_text,
        would_recommend=request.would_recommend,
        status=ReviewStatus.SUBMITTED,
    )
    db.add(review)
    await db.flush()

    # Save photos
    if request.photo_urls:
        for photo in request.photo_urls:
            rp = ReviewPhoto(
                review_id=review.id,
                cloudinary_public_id=photo.get("public_id", ""),
                cloudinary_secure_url=photo.get("secure_url", ""),
            )
            db.add(rp)

    # Update provider rating
    if booking.provider_id:
        avg_result = await db.execute(
            select(func.avg(Review.overall_rating), func.count(Review.id)).where(
                Review.provider_id == booking.provider_id
            )
        )
        avg_rating, total_reviews = avg_result.one()
        provider_result = await db.execute(
            select(User).where(User.id == booking.provider_id)
        )
        provider = provider_result.scalar_one_or_none()
        if provider:
            provider.average_rating = float(avg_rating) if avg_rating else 0
            provider.total_reviews = total_reviews or 0

    await db.flush()

    return APIResponse(
        success=True,
        message="Review submitted successfully",
        data={"review_id": review.id},
    )


@router.get("/reviews/provider/{provider_id}", response_model=APIResponse)
async def get_provider_reviews(
    provider_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get reviews for a provider."""
    result = await db.execute(
        select(Review).where(
            Review.provider_id == provider_id,
            Review.status == ReviewStatus.SUBMITTED,
        ).order_by(desc(Review.created_at)).limit(20)
    )
    reviews = result.scalars().all()

    # Get averages
    avg_result = await db.execute(
        select(
            func.avg(Review.overall_rating),
            func.avg(Review.professionalism_rating),
            func.avg(Review.communication_rating),
            func.avg(Review.service_quality_rating),
            func.avg(Review.timeliness_rating),
            func.count(Review.id),
        ).where(Review.provider_id == provider_id)
    )
    avgs = avg_result.one()

    return APIResponse(
        success=True,
        message="Provider reviews",
        data={
            "average_overall": round(float(avgs[0]), 1) if avgs[0] else 0,
            "average_professionalism": round(float(avgs[1]), 1) if avgs[1] else 0,
            "average_communication": round(float(avgs[2]), 1) if avgs[2] else 0,
            "average_service_quality": round(float(avgs[3]), 1) if avgs[3] else 0,
            "average_timeliness": round(float(avgs[4]), 1) if avgs[4] else 0,
            "total_reviews": avgs[5] or 0,
            "reviews": [{
                "id": r.id,
                "overall_rating": r.overall_rating,
                "review_text": r.review_text,
                "would_recommend": r.would_recommend,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            } for r in reviews],
        },
    )
