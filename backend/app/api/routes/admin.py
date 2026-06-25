"""
Admin backend API routes for Constructo platform.
"""
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from pydantic import BaseModel, Field

from app.db.session import get_db
from app.api.deps import require_admin
from app.models.user import User, UserRole, UserStatus
from app.models.booking import Booking, BookingStatus, ServiceCategory
from app.models.payment import Payment, PaymentStatus
from app.models.payout import Payout, PayoutStatus, ProviderEarning
from app.schemas.auth import APIResponse

router = APIRouter()


# ─── Schema Definitions ──────────────────────────────────────────────

class UpdateUserStatusRequest(BaseModel):
    status: str = Field(..., pattern="^(active|inactive|suspended|pending_verification)$")


class ApprovePayoutRequest(BaseModel):
    status: str = Field(..., pattern="^(completed|rejected)$")
    bank_reference: Optional[str] = None
    notes: Optional[str] = None


class ServiceCategoryCreateRequest(BaseModel):
    name: str = Field(..., max_length=255)
    slug: str = Field(..., max_length=255)
    description: Optional[str] = None
    icon: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0
    base_hourly_rate: float = Field(..., ge=0)
    overtime_hourly_rate: float = Field(0.0, ge=0)
    emergency_fee: float = Field(0.0, ge=0)
    reservation_fee: float = Field(200.0, ge=0)


class ServiceCategoryUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    slug: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    icon: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
    base_hourly_rate: Optional[float] = Field(None, ge=0)
    overtime_hourly_rate: Optional[float] = Field(None, ge=0)
    emergency_fee: Optional[float] = Field(None, ge=0)
    reservation_fee: Optional[float] = Field(None, ge=0)


# ─── Admin Dashboard Stats ──────────────────────────────────────────

@router.get("/dashboard", response_model=APIResponse)
async def get_admin_dashboard(
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve platform aggregated stats for admin dashboard."""
    # Total Users
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar() or 0

    # Total Bookings
    total_bookings_result = await db.execute(select(func.count(Booking.id)))
    total_bookings = total_bookings_result.scalar() or 0

    # Total Revenue (sum of all PAID payments)
    total_rev_result = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.status == PaymentStatus.PAID)
    )
    total_revenue = float(total_rev_result.scalar() or 0)

    # Active Providers
    active_providers_result = await db.execute(
        select(func.count(User.id)).where(
            User.role == UserRole.PROVIDER,
            User.status == UserStatus.ACTIVE,
        )
    )
    active_providers = active_providers_result.scalar() or 0

    return APIResponse(
        success=True,
        message="Admin dashboard stats retrieved successfully",
        data={
            "total_users": total_users,
            "total_bookings": total_bookings,
            "total_revenue": total_revenue,
            "active_providers": active_providers,
        },
    )


# ─── User Management ────────────────────────────────────────────────

@router.get("/users", response_model=APIResponse)
async def get_admin_users(
    role: Optional[str] = Query(None, pattern="^(customer|provider|admin)$"),
    status: Optional[str] = Query(None, pattern="^(active|inactive|suspended|pending_verification)$"),
    search: Optional[str] = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve users list with filters and search query."""
    query = select(User)

    if role:
        query = query.where(User.role == UserRole(role))
    if status:
        query = query.where(User.status == UserStatus(status))
    if search:
        query = query.where(
            or_(
                User.name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                User.phone.ilike(f"%{search}%"),
                User.business_name.ilike(f"%{search}%"),
            )
        )

    # Count total users for pagination
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * limit
    result = await db.execute(
        query.order_by(desc(User.created_at)).offset(offset).limit(limit)
    )
    users = result.scalars().all()

    return APIResponse(
        success=True,
        message="Users list retrieved successfully",
        data={
            "users": [
                {
                    "id": u.id,
                    "name": u.name,
                    "email": u.email,
                    "phone": u.phone,
                    "role": u.role.value,
                    "status": u.status.value,
                    "profile_photo_url": u.profile_photo_url,
                    "business_name": u.business_name,
                    "district": u.district,
                    "average_rating": u.average_rating,
                    "total_bookings_completed": u.total_bookings_completed,
                    "created_at": u.created_at.isoformat() if u.created_at else None,
                }
                for u in users
            ],
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit if total > 0 else 0,
        },
    )


@router.put("/users/{user_id}/status", response_model=APIResponse)
async def update_user_status(
    user_id: int,
    request: UpdateUserStatusRequest,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Suspend or activate a user account."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own status")

    user.status = UserStatus(request.status)
    await db.flush()

    return APIResponse(
        success=True,
        message=f"User status updated to {request.status}",
        data={"user_id": user.id, "status": user.status.value},
    )


# ─── Booking Management ─────────────────────────────────────────────

@router.get("/bookings", response_model=APIResponse)
async def get_admin_bookings(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve bookings list with status filter and customer/provider search."""
    query = select(Booking)

    if status:
        query = query.where(Booking.status == BookingStatus(status))

    # To search by customer name, provider name, or booking number, we join User table
    if search:
        # We can construct alias or direct joins.
        # Simple customer and provider selection
        query = query.where(
            or_(
                Booking.booking_number.ilike(f"%{search}%"),
                Booking.pickup_address.ilike(f"%{search}%"),
            )
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    offset = (page - 1) * limit
    result = await db.execute(
        query.order_by(desc(Booking.created_at)).offset(offset).limit(limit)
    )
    bookings = result.scalars().all()

    # Load users details for return payload
    booking_list = []
    for b in bookings:
        # Load customer name
        cust_res = await db.execute(select(User.name).where(User.id == b.customer_id))
        cust_name = cust_res.scalar() or "Unknown"

        prov_name = None
        if b.provider_id:
            prov_res = await db.execute(select(User.name).where(User.id == b.provider_id))
            prov_name = prov_res.scalar()

        service_res = await db.execute(select(ServiceCategory.name).where(ServiceCategory.id == b.service_category_id))
        service_name = service_res.scalar() or f"Service #{b.service_category_id}"

        booking_list.append({
            "id": b.id,
            "booking_number": b.booking_number,
            "customer_id": b.customer_id,
            "customer_name": cust_name,
            "provider_id": b.provider_id,
            "provider_name": prov_name,
            "service_name": service_name,
            "status": b.status.value,
            "estimated_price": float(b.estimated_price),
            "final_amount": float(b.final_amount) if b.final_amount else None,
            "pickup_address": b.pickup_address,
            "created_at": b.created_at.isoformat() if b.created_at else None,
        })

    return APIResponse(
        success=True,
        message="Bookings retrieved successfully",
        data={
            "bookings": booking_list,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit if total > 0 else 0,
        },
    )


# ─── Payout Approvals ───────────────────────────────────────────────

@router.get("/payouts", response_model=APIResponse)
async def get_admin_payouts(
    status: Optional[str] = Query(None, pattern="^(pending|processing|completed|failed|rejected)$"),
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve list of payout requests with status filter."""
    query = select(Payout)
    if status:
        query = query.where(Payout.status == PayoutStatus(status))
    else:
        query = query.where(Payout.status == PayoutStatus.PENDING)

    result = await db.execute(query.order_by(desc(Payout.created_at)))
    payouts = result.scalars().all()

    payout_list = []
    for p in payouts:
        prov_res = await db.execute(
            select(User.name, User.business_name).where(User.id == p.provider_id)
        )
        prov_data = prov_res.fetchone()
        prov_name = prov_data[0] if prov_data else "Unknown"
        prov_business = prov_data[1] if prov_data else None

        payout_list.append({
            "id": p.id,
            "provider_id": p.provider_id,
            "provider_name": prov_name,
            "business_name": prov_business,
            "amount": float(p.amount),
            "status": p.status.value,
            "notes": p.notes,
            "bank_reference": p.bank_reference,
            "requested_at": p.requested_at.isoformat() if p.requested_at else (p.created_at.isoformat() if p.created_at else None),
            "processed_at": p.processed_at.isoformat() if p.processed_at else None,
        })

    return APIResponse(
        success=True,
        message="Payout requests retrieved successfully",
        data=payout_list,
    )


@router.post("/payouts/{payout_id}/approve", response_model=APIResponse)
async def approve_payout(
    payout_id: int,
    request: ApprovePayoutRequest,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Approve/Complete or Reject a pending payout request."""
    result = await db.execute(select(Payout).where(Payout.id == payout_id))
    payout = result.scalar_one_or_none()
    if not payout:
        raise HTTPException(status_code=404, detail="Payout request not found")

    if payout.status != PayoutStatus.PENDING and payout.status != PayoutStatus.PROCESSING:
        raise HTTPException(status_code=400, detail="Payout has already been processed")

    now = datetime.now(timezone.utc)
    payout.status = PayoutStatus(request.status)
    payout.bank_reference = request.bank_reference
    payout.notes = request.notes
    payout.admin_id = current_admin.id
    payout.processed_at = now

    await db.flush()

    # If approved, notify provider
    try:
        from app.services.notification_service import NotificationService
        if request.status == "completed":
            await NotificationService.create_notification(
                db=db,
                user_id=payout.provider_id,
                title="Payout Processed Successfully",
                message=f"Your payout request for ₹{float(payout.amount):.2f} has been processed. Ref: {request.bank_reference or 'N/A'}",
                notification_type="payment",
                data={"payout_id": payout.id, "amount": float(payout.amount), "status": "completed"}
            )
        elif request.status == "rejected":
            await NotificationService.create_notification(
                db=db,
                user_id=payout.provider_id,
                title="Payout Request Rejected",
                message=f"Your payout request for ₹{float(payout.amount):.2f} was rejected. Reason: {request.notes or 'N/A'}",
                notification_type="payment",
                data={"payout_id": payout.id, "amount": float(payout.amount), "status": "rejected"}
            )
    except Exception as e:
        # Non-blocking notification error logging
        import logging
        logging.getLogger(__name__).warning(f"Failed to notify payout update: {e}")

    return APIResponse(
        success=True,
        message=f"Payout request status updated to {request.status}",
        data={
            "payout_id": payout.id,
            "status": payout.status.value,
            "processed_at": now.isoformat(),
        },
    )


# ─── Service Category Management ───────────────────────────────────

@router.get("/services", response_model=APIResponse)
async def get_admin_services(
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all service categories (active and inactive)."""
    result = await db.execute(select(ServiceCategory).order_by(ServiceCategory.sort_order))
    categories = result.scalars().all()

    return APIResponse(
        success=True,
        message="Service categories retrieved successfully",
        data=[
            {
                "id": c.id,
                "name": c.name,
                "slug": c.slug,
                "description": c.description,
                "icon": c.icon,
                "image_url": c.image_url,
                "is_active": c.is_active,
                "sort_order": c.sort_order,
                "base_hourly_rate": float(c.base_hourly_rate),
                "overtime_hourly_rate": float(c.overtime_hourly_rate),
                "emergency_fee": float(c.emergency_fee),
                "reservation_fee": float(c.reservation_fee),
            }
            for c in categories
        ],
    )


@router.post("/services", response_model=APIResponse)
async def create_service_category(
    request: ServiceCategoryCreateRequest,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Create a new service category."""
    # Check if name or slug exists
    exists_res = await db.execute(
        select(ServiceCategory).where(
            or_(
                ServiceCategory.name == request.name,
                ServiceCategory.slug == request.slug,
            )
        )
    )
    if exists_res.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Service category with this name or slug already exists",
        )

    category = ServiceCategory(
        name=request.name,
        slug=request.slug,
        description=request.description,
        icon=request.icon,
        image_url=request.image_url,
        is_active=request.is_active,
        sort_order=request.sort_order,
        base_hourly_rate=Decimal(str(request.base_hourly_rate)),
        overtime_hourly_rate=Decimal(str(request.overtime_hourly_rate)),
        emergency_fee=Decimal(str(request.emergency_fee)),
        reservation_fee=Decimal(str(request.reservation_fee)),
    )
    db.add(category)
    await db.flush()
    await db.refresh(category)

    return APIResponse(
        success=True,
        message="Service category created successfully",
        data={
            "id": category.id,
            "name": category.name,
            "slug": category.slug,
        },
    )


@router.put("/services/{category_id}", response_model=APIResponse)
async def update_service_category(
    category_id: int,
    request: ServiceCategoryUpdateRequest,
    current_admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing service category."""
    result = await db.execute(
        select(ServiceCategory).where(ServiceCategory.id == category_id)
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Service category not found")

    # Update fields if provided
    if request.name is not None:
        category.name = request.name
    if request.slug is not None:
        category.slug = request.slug
    if request.description is not None:
        category.description = request.description
    if request.icon is not None:
        category.icon = request.icon
    if request.image_url is not None:
        category.image_url = request.image_url
    if request.is_active is not None:
        category.is_active = request.is_active
    if request.sort_order is not None:
        category.sort_order = request.sort_order
    if request.base_hourly_rate is not None:
        category.base_hourly_rate = Decimal(str(request.base_hourly_rate))
    if request.overtime_hourly_rate is not None:
        category.overtime_hourly_rate = Decimal(str(request.overtime_hourly_rate))
    if request.emergency_fee is not None:
        category.emergency_fee = Decimal(str(request.emergency_fee))
    if request.reservation_fee is not None:
        category.reservation_fee = Decimal(str(request.reservation_fee))

    await db.flush()

    return APIResponse(
        success=True,
        message="Service category updated successfully",
        data={
            "id": category.id,
            "name": category.name,
            "slug": category.slug,
        },
    )
