from fastapi import FastAPI

from backend.core.config import settings
from backend.api.v1.auth import router as auth_router
from backend.api.v1.contacts import router as contacts_router
from backend.api.v1.deals import router as deals_router
from backend.api.v1.interactions import router as interactions_router

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)


app.include_router(
    auth_router,
    prefix="/api/v1",
)

app.include_router(
    contacts_router,
    prefix="/api/v1",
)

app.include_router(
    deals_router,
    prefix="/api/v1",
)

app.include_router(
    interactions_router,
    prefix="/api/v1",
)

@app.get("/health")
async def health_check():
    return {
        "status": "ok"
    }