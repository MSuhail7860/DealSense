from datetime import datetime
from typing import Literal

from pydantic import BaseModel


InteractionType = Literal[
    "email",
    "call",
    "meeting",
    "note",
]


class InteractionCreate(BaseModel):
    type: InteractionType
    content: str
    sentiment_score: float | None = None
    response_time_minutes: int | None = None


class InteractionResponse(BaseModel):
    id: str
    deal_id: str
    type: InteractionType
    content: str
    sentiment_score: float | None
    response_time_minutes: int | None
    created_at: datetime