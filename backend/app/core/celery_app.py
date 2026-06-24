"""
Celery application configuration for background tasks.
"""
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "constructo",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        "cleanup-expired-otps": {
            "task": "app.tasks.cleanup_expired_otps",
            "schedule": 300.0,  # every 5 minutes
        },
        "cleanup-expired-sessions": {
            "task": "app.tasks.cleanup_expired_sessions",
            "schedule": 3600.0,  # every hour
        },
    },
)
