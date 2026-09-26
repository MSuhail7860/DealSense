import joblib
import pandas as pd
from pathlib import Path
from fastapi import FastAPI, HTTPException
from app.schemas import PredictRequest, PredictResponse
from contextlib import asynccontextmanager

MODEL_PATH = Path("models/xgb-v0.1.pkl")
ml_models = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    if MODEL_PATH.exists():
        ml_models["bundle"] = joblib.load(MODEL_PATH)
        print(f"Loaded model {ml_models['bundle']['version']}")
    else:
        print("No model found. Running in dummy mode.")
        ml_models["bundle"] = None
    yield
    ml_models.clear()

app = FastAPI(title="DealSense ML Service", lifespan=lifespan)

@app.get("/health")
def health():
    bundle = ml_models.get("bundle")
    if bundle:
        return {"status": "ok", "model_version": bundle["version"]}
    return {"status": "ok", "model_version": "mock-v0"}

@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    bundle = ml_models.get("bundle")
    if not bundle:
        return PredictResponse(
            win_probability=0.63,
            churn_risk=0.37,
            model_version="mock-v0"
        )
        
    pipeline = bundle["model"]
    
    df = pd.DataFrame([{
        "deal_value": request.deal_value,
        "stage": request.stage,
        "days_in_stage": request.days_in_stage,
        "num_interactions": request.num_interactions,
        "avg_response_min": request.avg_response_min,
        "days_since_last": request.days_since_last,
        "sentiment_trend": request.sentiment_trend
    }])
    
    try:
        y_prob = pipeline.predict_proba(df)[0, 1]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    win_probability = max(0.0, min(1.0, float(y_prob)))
    churn_risk = 1.0 - win_probability
    
    return PredictResponse(
        win_probability=win_probability,
        churn_risk=churn_risk,
        model_version=bundle["version"]
    )
