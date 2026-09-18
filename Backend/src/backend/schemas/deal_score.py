from datetime import datetime

from pydantic import BaseModel


class DealScoreResponse(BaseModel):
    id: str
    deal_id: str
    win_probability: float
    churn_risk: float
    model_version: str
    computed_at: datetime