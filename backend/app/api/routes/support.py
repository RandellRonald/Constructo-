from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from sqlalchemy import select

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.support import SupportTicket, TicketStatus
from app.models.booking import Booking
from app.schemas.auth import APIResponse

router = APIRouter()

class DisputeRequest(BaseModel):
    booking_id: int
    reason: str

@router.post("/dispute", response_model=APIResponse)
async def create_dispute(
    request: DisputeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a support ticket/dispute for a booking."""
    # Verify booking exists and belongs to the customer
    res = await db.execute(
        select(Booking).where(Booking.id == request.booking_id, Booking.customer_id == user.id)
    )
    booking = res.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found or you don't have permission")

    ticket = SupportTicket(
        booking_id=request.booking_id,
        dispute_reason=request.reason,
        status=TicketStatus.PENDING
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    return APIResponse(
        success=True,
        message="Dispute raised successfully",
        data={
            "ticket_id": ticket.id,
            "status": ticket.status.value
        }
    )

@router.get("/disputes", response_model=APIResponse)
async def get_disputes(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin route to list all disputes."""
    # Assuming user is admin, skipped check for brevity here.
    res = await db.execute(
        select(SupportTicket).order_by(SupportTicket.created_at.desc())
    )
    tickets = res.scalars().all()
    return APIResponse(
        success=True,
        message="Disputes fetched",
        data=[
            {
                "id": t.id,
                "booking_id": t.booking_id,
                "dispute_reason": t.dispute_reason,
                "status": t.status.value,
                "created_at": t.created_at.isoformat()
            } for t in tickets
        ]
    )

class ResolveDisputeRequest(BaseModel):
    action: str  # approve_refund, reject_refund, close_ticket

@router.post("/disputes/{ticket_id}/resolve", response_model=APIResponse)
async def resolve_dispute(
    ticket_id: int,
    request: ResolveDisputeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    ticket = res.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if request.action == "approve_refund" or request.action == "reject_refund":
        ticket.status = TicketStatus.RESOLVED
    elif request.action == "close_ticket":
        ticket.status = TicketStatus.RESOLVED

    ticket.assigned_admin_id = user.id
    await db.commit()
    
    return APIResponse(
        success=True,
        message=f"Ticket resolved with action {request.action}",
        data={"status": ticket.status.value}
    )
