from celery import Celery

from backend.core.config import settings


celery_app = Celery(
    "dealsense",
    broker=settings.redis_url,
    backend=settings.redis_url,
)


celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    imports=("backend.tasks",),
)