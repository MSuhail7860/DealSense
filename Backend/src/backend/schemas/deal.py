from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel


DealStage = Literal[
    "lead",
    "qualified",
    "proposal",
    "negotiation",
    "won",
    "lost",
]


class DealCreate(BaseModel):
    contact_id: str
    stage: DealStage
    value: Decimal


class DealUpdate(BaseModel):
    contact_id: str | None = None
    stage: DealStage | None = None
    value: Decimal | None = None
    closed_at: datetime | None = None


class DealResponse(BaseModel):
    id: str
    contact_id: str
    owner_id: str
    stage: DealStage
    value: Decimal
    created_at: datetime
    closed_at: datetime | None