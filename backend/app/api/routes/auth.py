"""
Authentication API routes.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest, LoginRequest, SendOTPRequest, VerifyOTPRequest,
    ForgotPasswordRequest, ResetPasswordRequest, RefreshTokenRequest,
    TokenResponse, UserResponse, APIResponse,
)
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=APIResponse)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register a new customer or provider."""
    try:
        user = await AuthService.register(
            db=db,
            name=request.name,
            email=request.email,
            phone=request.phone,
            password=request.password,
            role=request.role,
            business_name=request.business_name,
            district=request.district,
            service_categories=request.service_categories,
        )
        return APIResponse(
            success=True,
            message="Registration successful. Please verify your phone number.",
            data={"user_id": user.id, "phone": user.phone},
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=APIResponse)
async def login(
    request: LoginRequest,
    req: Request,
    db: AsyncSession = Depends(get_db),
):
    """Login with email/phone and password."""
    try:
        user, access_token, refresh_token = await AuthService.login(
            db=db,
            identifier=request.identifier,
            password=request.password,
            device_name=request.device_name,
            ip_address=req.client.host if req.client else None,
            user_agent=req.headers.get("user-agent"),
        )
        return APIResponse(
            success=True,
            message="Login successful",
            data={
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "expires_in": 1800,
                "user": UserResponse.model_validate(user).model_dump(),
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/logout", response_model=APIResponse)
async def logout(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Logout and revoke current session."""
    await AuthService.logout(db=db, user_id=user.id)
    return APIResponse(success=True, message="Logged out successfully")


@router.post("/send-otp", response_model=APIResponse)
async def send_otp(
    request: SendOTPRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send OTP to phone number."""
    try:
        otp_code = await AuthService.send_otp(
            db=db, phone=request.phone, purpose=request.purpose
        )
        data = {"phone": request.phone}
        # Include OTP in dev mode for testing
        from app.core.config import settings
        if settings.ENVIRONMENT == "development":
            data["otp_code"] = otp_code
        return APIResponse(
            success=True,
            message="OTP sent successfully",
            data=data,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/verify-otp", response_model=APIResponse)
async def verify_otp(
    request: VerifyOTPRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verify OTP code."""
    try:
        await AuthService.verify_otp(
            db=db, phone=request.phone, otp_code=request.otp_code, purpose=request.purpose
        )
        return APIResponse(
            success=True,
            message="Phone verified successfully",
            data={"phone": request.phone, "verified": True},
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/forgot-password", response_model=APIResponse)
async def forgot_password(
    request: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send OTP for password reset."""
    try:
        await AuthService.send_otp(db=db, phone=request.phone, purpose="reset")
        return APIResponse(
            success=True,
            message="OTP sent for password reset",
            data={"phone": request.phone},
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/reset-password", response_model=APIResponse)
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reset password after OTP verification."""
    try:
        # First verify OTP
        await AuthService.verify_otp(
            db=db, phone=request.phone, otp_code=request.otp_code, purpose="reset"
        )
        # Then reset password
        await AuthService.reset_password(
            db=db, phone=request.phone, new_password=request.new_password
        )
        return APIResponse(success=True, message="Password reset successful")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/me", response_model=APIResponse)
async def get_current_user_profile(
    user: User = Depends(get_current_user),
):
    """Get current user profile."""
    return APIResponse(
        success=True,
        message="User profile retrieved",
        data={"user": UserResponse.model_validate(user).model_dump()},
    )


@router.post("/refresh", response_model=APIResponse)
async def refresh_tokens(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Refresh access token."""
    try:
        access_token, refresh_token = await AuthService.refresh_tokens(
            db=db, refresh_token_str=request.refresh_token
        )
        return APIResponse(
            success=True,
            message="Tokens refreshed",
            data={
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "expires_in": 1800,
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
