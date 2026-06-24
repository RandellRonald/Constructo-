"""
Constructo Backend – FastAPI Application
Professional Site Services Across Kerala
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import settings
from app.api.routes import auth, customer, bookings, services, payments, tracking, completion, reviews
from app.db.session import engine
from app.db.base import Base
from app.api.websocket import router as ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    # Startup: Create tables (dev only — use Alembic in production)
    if settings.ENVIRONMENT == "development":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown: Dispose engine
    await engine.dispose()


app = FastAPI(
    title="Constructo API",
    description="Professional Site Services Across Kerala – Backend API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/api/redoc" if settings.ENVIRONMENT == "development" else None,
)

# ─── Middleware ───────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.ENVIRONMENT == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["constructo.in", "*.constructo.in"],
    )

# ─── API Routes ──────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(customer.router, prefix="/api/v1/customer", tags=["Customer"])
app.include_router(bookings.router, prefix="/api/v1/bookings", tags=["Bookings"])
app.include_router(services.router, prefix="/api/v1/services", tags=["Services"])
app.include_router(payments.router, prefix="/api/v1/payments", tags=["Payments"])
app.include_router(tracking.router, prefix="/api/v1", tags=["Tracking"])
app.include_router(completion.router, prefix="/api/v1", tags=["Completion"])
app.include_router(reviews.router, prefix="/api/v1", tags=["Reviews"])

# ─── WebSocket Routes ────────────────────────────────────────────────
app.include_router(ws_router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "constructo-api", "version": "1.0.0"}
