"""
Authentication service: registration, login, OTP, JWT management.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.models.user import User, OTPVerification, UserSession, UserRole, UserStatus
from app.core.security import (
    get_password_hash, verify_password,
    create_access_token, create_refresh_token,
    decode_token, generate_otp
)
from app.core.config import settings

logger = logging.getLogger(__name__)


class AuthService:
    """Handles all authentication operations."""

    @staticmethod
    async def register(
        db: AsyncSession,
        name: str,
        email: str,
        phone: str,
        password: str,
        role: str,
        business_name: Optional[str] = None,
        district: Optional[str] = None,
        service_categories: Optional[str] = None,
    ) -> User:
        """Register a new user (customer or provider)."""
        # Check for existing email
        existing = await db.execute(
            select(User).where(or_(User.email == email, User.phone == phone))
        )
        existing_user = existing.scalar_one_or_none()
        if existing_user:
            if existing_user.email == email:
                raise ValueError("Email already registered")
            raise ValueError("Phone number already registered")

        user = User(
            name=name,
            email=email,
            phone=phone,
            password_hash=get_password_hash(password),
            role=UserRole(role),
            status=UserStatus.PENDING_VERIFICATION,
            business_name=business_name,
            district=district,
            service_categories=service_categories,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
        return user

    @staticmethod
    async def login(
        db: AsyncSession,
        identifier: str,
        password: str,
        device_name: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[User, str, str]:
        """Authenticate user and return tokens."""
        # Find user by email or phone
        result = await db.execute(
            select(User).where(
                or_(User.email == identifier.lower(), User.phone == identifier)
            )
        )
        user = result.scalar_one_or_none()

        if not user or not verify_password(password, user.password_hash):
            raise ValueError("Invalid credentials")

        if user.status == UserStatus.SUSPENDED:
            raise ValueError("Account suspended. Contact support.")

        # Create tokens
        token_data = {"sub": str(user.id), "role": user.role.value}
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)

        # Decode to get JTI
        access_payload = decode_token(access_token)

        # Create session
        session = UserSession(
            user_id=user.id,
            jwt_id=access_payload["jti"],
            device_name=device_name,
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        db.add(session)
        await db.flush()

        return user, access_token, refresh_token

    @staticmethod
    async def logout(db: AsyncSession, user_id: int, jwt_id: Optional[str] = None):
        """Revoke user session(s)."""
        if jwt_id:
            result = await db.execute(
                select(UserSession).where(
                    UserSession.user_id == user_id,
                    UserSession.jwt_id == jwt_id,
                )
            )
            session = result.scalar_one_or_none()
            if session:
                session.is_active = False
        else:
            # Logout all sessions
            result = await db.execute(
                select(UserSession).where(
                    UserSession.user_id == user_id,
                    UserSession.is_active == True,
                )
            )
            sessions = result.scalars().all()
            for session in sessions:
                session.is_active = False

    @staticmethod
    async def send_otp(
        db: AsyncSession,
        phone: str,
        purpose: str = "registration",
    ) -> str:
        """Generate and send OTP. Returns OTP code (logged in dev)."""
        otp_code = generate_otp()
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.OTP_EXPIRY_SECONDS)

        otp = OTPVerification(
            phone=phone,
            otp_code=otp_code,
            expires_at=expires_at,
            purpose=purpose,
        )
        db.add(otp)
        await db.flush()

        # In development, log the OTP
        if settings.ENVIRONMENT == "development":
            logger.warning(f"[DEV OTP] Phone: {phone} | OTP: {otp_code} | Purpose: {purpose}")
            print(f"\n{'='*50}")
            print(f"  DEV OTP: {otp_code}")
            print(f"  Phone:   {phone}")
            print(f"  Purpose: {purpose}")
            print(f"{'='*50}\n")
        else:
            # TODO: Send via MSG91 in production
            pass

        return otp_code

    @staticmethod
    async def verify_otp(
        db: AsyncSession,
        phone: str,
        otp_code: str,
        purpose: str = "registration",
    ) -> bool:
        """Verify OTP code."""
        result = await db.execute(
            select(OTPVerification).where(
                OTPVerification.phone == phone,
                OTPVerification.purpose == purpose,
                OTPVerification.is_verified == False,
            ).order_by(OTPVerification.created_at.desc()).limit(1)
        )
        otp = result.scalar_one_or_none()

        if not otp:
            raise ValueError("No OTP found. Please request a new one.")

        if otp.attempts >= settings.OTP_MAX_ATTEMPTS:
            raise ValueError("Maximum attempts exceeded. Request a new OTP.")

        otp.attempts += 1

        otp_expires_at = otp.expires_at
        if otp_expires_at.tzinfo is None:
            otp_expires_at = otp_expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > otp_expires_at:
            raise ValueError("OTP expired. Please request a new one.")

        if otp.otp_code != otp_code:
            await db.flush()
            raise ValueError("Invalid OTP code")

        otp.is_verified = True
        await db.flush()

        # If registration, verify phone
        if purpose == "registration":
            user_result = await db.execute(
                select(User).where(User.phone == phone)
            )
            user = user_result.scalar_one_or_none()
            if user:
                user.is_phone_verified = True
                user.status = UserStatus.ACTIVE
                await db.flush()

        return True

    @staticmethod
    async def refresh_tokens(
        db: AsyncSession,
        refresh_token_str: str,
    ) -> Tuple[str, str]:
        """Refresh access and refresh tokens."""
        payload = decode_token(refresh_token_str)
        if not payload or payload.get("type") != "refresh":
            raise ValueError("Invalid refresh token")

        user_id = payload.get("sub")
        token_data = {"sub": user_id, "role": payload.get("role")}

        new_access = create_access_token(token_data)
        new_refresh = create_refresh_token(token_data)

        # Update session with new JTI
        access_payload = decode_token(new_access)
        session = UserSession(
            user_id=int(user_id),
            jwt_id=access_payload["jti"],
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        db.add(session)
        await db.flush()

        return new_access, new_refresh

    @staticmethod
    async def reset_password(
        db: AsyncSession,
        phone: str,
        new_password: str,
    ):
        """Reset user password after OTP verification."""
        result = await db.execute(select(User).where(User.phone == phone))
        user = result.scalar_one_or_none()
        if not user:
            raise ValueError("User not found")

        user.password_hash = get_password_hash(new_password)
        await db.flush()
