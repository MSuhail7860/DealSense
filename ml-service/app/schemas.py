from pydantic import BaseModel

class PredictRequest(BaseModel):
    deal_value: float
    stage: str
    days_in_stage: int
    num_interactions: int
    avg_response_min: float
    days_since_last: int
    sentiment_trend: float

class PredictResponse(BaseModel):
    win_probability: float
    churn_risk: float
    model_version: str
