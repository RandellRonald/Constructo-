"""
Pydantic schemas for authentication requests and responses.
"""
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, EmailStr, Field, field_validator
import re


class RegisterRequest(BaseModel):
    """Customer or Provider registration request."""
    name: str = Field(..., min_length=2, max_length=255)
    email: str = Field(..., max_length=255)
    phone: str = Field(..., min_length=10, max_length=15)
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(..., pattern="^(customer|provider)$")

    # Provider-specific
    business_name: Optional[str] = Field(None, max_length=255)
    district: Optional[str] = Field(None, max_length=100)
    service_categories: Optional[str] = None  # JSON array of category IDs

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, v):
            raise ValueError("Invalid email address")
        return v.lower()

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = re.sub(r'[^\d+]', '', v)
        if not re.match(r'^\+?[1-9]\d{9,14}$', cleaned):
            raise ValueError("Invalid phone number")
        return cleaned

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.search(r'[A-Z]', v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r'[a-z]', v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r'\d', v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError("Password must contain at least one special character")
        return v

    @field_validator("confirm_password")
    @classmethod
    def validate_confirm_password(cls, v: str, info) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v


class LoginRequest(BaseModel):
    """Login request - supports email or phone."""
    identifier: str = Field(..., description="Email or phone number")
    password: str = Field(..., min_length=1)
    device_name: Optional[str] = None


class SendOTPRequest(BaseModel):
    """Request to send OTP."""
    phone: str = Field(..., min_length=10, max_length=15)
    purpose: str = Field(default="registration", pattern="^(registration|login|reset)$")


class VerifyOTPRequest(BaseModel):
    """OTP verification request."""
    phone: str = Field(..., min_length=10, max_length=15)
    otp_code: str = Field(..., min_length=6, max_length=6)
    purpose: str = Field(default="registration")


class ForgotPasswordRequest(BaseModel):
    """Forgot password - send OTP."""
    phone: str = Field(..., min_length=10, max_length=15)


class ResetPasswordRequest(BaseModel):
    """Reset password after OTP verification."""
    phone: str = Field(..., min_length=10, max_length=15)
    otp_code: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("confirm_password")
    @classmethod
    def validate_confirm_password(cls, v: str, info) -> str:
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match")
        return v


class RefreshTokenRequest(BaseModel):
    """Refresh token request."""
    refresh_token: str


class TokenResponse(BaseModel):
    """JWT token pair response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    """User profile response."""
    id: int
    name: str
    email: str
    phone: str
    role: str
    is_phone_verified: bool
    status: str
    profile_photo_url: Optional[str] = None
    business_name: Optional[str] = None
    district: Optional[str] = None
    average_rating: Optional[float] = None
    total_reviews: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class APIResponse(BaseModel):
    """Standard API response wrapper."""
    success: bool
    message: str
    data: Optional[Any] = None
