from fastapi import FastAPI

from backend.core.config import settings
from backend.api.v1.auth import router as auth_router
from backend.api.v1.contacts import router as contacts_router
from backend.api.v1.deals import router as deals_router
from backend.api.v1.interactions import router as interactions_router
from backend.api.v1.deal_scores import router as deal_scores_router
from backend.api.v1.websocket import router as websocket_router
from backend.api.v1.copilot import router as copilot_router

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://localhost:8001",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
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

app.include_router(
    deal_scores_router, 
    prefix="/api/v1",
)

app.include_router(
    copilot_router,
    prefix="/api/v1",
)

app.include_router(
    websocket_router,
)

@app.get("/health")
@app.get("/api/health")
async def health_check():
    return {
        "status": "ok"
    }