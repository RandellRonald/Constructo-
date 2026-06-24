"""
Application configuration using Pydantic Settings.
All environment variables are loaded from .env file.
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ─── App ──────────────────────────────────────────────────────
    ENVIRONMENT: str = "development"
    APP_NAME: str = "Constructo"
    APP_VERSION: str = "1.0.0"

    # ─── Database ─────────────────────────────────────────────────
    DATABASE_URL: str = "mysql+asyncmy://constructo_user:constructo_pass_2024@localhost:3306/constructo"

    # ─── Redis ────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ─── JWT ──────────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "constructo-jwt-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ─── CORS ─────────────────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174,http://localhost:5175"

    @property
    def CORS_ORIGINS_LIST(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    # ─── Razorpay ─────────────────────────────────────────────────
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    # ─── Cloudinary ───────────────────────────────────────────────
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # ─── MSG91 ────────────────────────────────────────────────────
    MSG91_AUTH_KEY: str = ""
    MSG91_TEMPLATE_ID: str = ""
    MSG91_SENDER_ID: str = "CNSTRO"

    # ─── Google Maps ──────────────────────────────────────────────
    GOOGLE_MAPS_API_KEY: str = ""

    # ─── OTP Settings ─────────────────────────────────────────────
    OTP_EXPIRY_SECONDS: int = 300  # 5 minutes
    OTP_MAX_ATTEMPTS: int = 5
    OTP_RESEND_COOLDOWN: int = 30  # seconds

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
