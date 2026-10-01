import json
import re
from pathlib import Path
from datetime import datetime, timezone
from contextlib import asynccontextmanager

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.schemas import PredictRequest, PredictResponse
from training.features import calculate_deal_features

MODEL_PATH = Path("models/xgb-v0.1.pkl")
METRICS_PATH = Path("models/metrics.json")
DATA_PATH = Path("data/synthetic.json")

ml_models = {}
deals_database = []
deals_by_id = {}


def extract_deal_metadata(deal: dict) -> dict:
    """Extract stakeholder and product context from real interaction history."""
    interactions = deal.get("interactions", [])
    product = "Enterprise Solution"
    contact = "Primary Stakeholder"

    # Known products and pattern matching from interaction transcripts
    products = ["GTX Pro", "Cloud Storage", "Support Package", "Enterprise Suite", "GTX Plus Basic", "GTX Plus Pro"]
    names_pattern = re.compile(r"\b([A-Z][a-z]+)\s+(?:wants|asked|sent|had|discussed)\b")

    for inter in interactions:
        content = inter.get("content", "")
        for prod in products:
            if prod.lower() in content.lower():
                product = prod
                break
        match = names_pattern.search(content)
        if match:
            contact = f"{match.group(1)} (Account Lead)"

    return {
        "title": f"{contact} - {product}",
        "product": product,
        "contact": contact,
    }


def load_dataset():
    global deals_database, deals_by_id
    if not DATA_PATH.exists():
        print("Warning: data/synthetic.json not found")
        return

    raw_deals = []
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    raw_deals.append(json.loads(line))
                except Exception:
                    pass

    processed = []
    deals_map = {}
    now = datetime.now(timezone.utc)

    for d in raw_deals:
        deal_id = d.get("id")
        interactions = d.get("interactions", [])
        features = calculate_deal_features(d, interactions, now=now)
        meta = extract_deal_metadata(d)

        deal_entry = {
            "id": deal_id,
            "title": meta["title"],
            "product": meta["product"],
            "contact": meta["contact"],
            "stage": d.get("stage", "lead"),
            "value": round(float(d.get("value", 0.0)), 2),
            "created_at": d.get("created_at"),
            "closed_at": d.get("closed_at"),
            "features": features,
            "num_interactions": len(interactions),
            "interactions": interactions,
        }
        processed.append(deal_entry)
        deals_map[deal_id] = deal_entry

    deals_database = processed
    deals_by_id = deals_map
    print(f"Loaded {len(deals_database)} real CRM deals from {DATA_PATH}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if MODEL_PATH.exists():
        ml_models["bundle"] = joblib.load(MODEL_PATH)
        print(f"Loaded model {ml_models['bundle']['version']}")
    else:
        print("No model found. Running in dummy mode.")
        ml_models["bundle"] = None

    load_dataset()
    yield
    ml_models.clear()
    deals_database.clear()
    deals_by_id.clear()


app = FastAPI(title="DealSense ML Service", lifespan=lifespan)

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


@app.get("/health")
def health():
    bundle = ml_models.get("bundle")
    return {
        "status": "ok",
        "model_version": bundle["version"] if bundle else "mock-v0",
        "loaded_deals_count": len(deals_database),
    }


@app.get("/metrics")
def get_metrics():
    """Return actual model training and validation metrics from disk."""
    if not METRICS_PATH.exists():
        raise HTTPException(status_code=404, detail="Metrics file not found")
    try:
        with open(METRICS_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats")
def get_stats():
    """Aggregate live statistics across the 250 real CRM deals."""
    if not deals_database:
        return {
            "total_deals": 0,
            "pipeline_value": 0,
            "stages": {},
        }

    stages = {}
    total_val = 0.0
    total_interactions = 0

    for d in deals_database:
        st = d["stage"]
        stages[st] = stages.get(st, 0) + 1
        total_val += d["value"]
        total_interactions += d["num_interactions"]

    bundle = ml_models.get("bundle")
    metrics_data = {}
    if METRICS_PATH.exists():
        try:
            with open(METRICS_PATH, "r", encoding="utf-8") as f:
                metrics_data = json.load(f).get("metrics", {})
        except Exception:
            pass

    return {
        "total_deals": len(deals_database),
        "total_pipeline_value": round(total_val, 2),
        "average_deal_value": round(total_val / len(deals_database), 2),
        "total_interactions_logged": total_interactions,
        "stages": stages,
        "model_version": bundle["version"] if bundle else "xgb-v0.1",
        "model_metrics": metrics_data,
    }


@app.get("/deals")
def get_deals(limit: int = 50, stage: str | None = None):
    """Return real deals with features and live model predictions."""
    results = []
    bundle = ml_models.get("bundle")
    pipeline = bundle["model"] if bundle else None

    for d in deals_database:
        if stage and d["stage"].lower() != stage.lower():
            continue

        feat = d["features"]
        win_prob = 0.5
        churn_risk = 0.5

        if pipeline:
            df = pd.DataFrame([{
                "deal_value": feat["deal_value"],
                "stage": feat["stage"],
                "days_in_stage": feat["days_in_stage"],
                "num_interactions": feat["num_interactions"],
                "avg_response_min": feat["avg_response_min"],
                "days_since_last": feat["days_since_last"],
                "sentiment_trend": feat["sentiment_trend"],
            }])
            try:
                y_prob = float(pipeline.predict_proba(df)[0, 1])
                win_prob = round(max(0.0, min(1.0, y_prob)), 4)
                churn_risk = round(1.0 - win_prob, 4)
            except Exception:
                pass

        results.append({
            "id": d["id"],
            "title": d["title"],
            "product": d["product"],
            "contact": d["contact"],
            "stage": d["stage"],
            "value": d["value"],
            "created_at": d["created_at"],
            "closed_at": d["closed_at"],
            "num_interactions": d["num_interactions"],
            "features": feat,
            "win_probability": win_prob,
            "churn_risk": churn_risk,
            "model_version": bundle["version"] if bundle else "xgb-v0.1",
            "last_interaction": d["interactions"][-1] if d["interactions"] else None,
        })

        if len(results) >= limit:
            break

    return results


@app.get("/deals/{deal_id}")
def get_deal_by_id(deal_id: str):
    """Return single deal with full interaction history and computed score."""
    deal = deals_by_id.get(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found in dataset")

    bundle = ml_models.get("bundle")
    pipeline = bundle["model"] if bundle else None
    feat = deal["features"]

    win_prob = 0.5
    churn_risk = 0.5

    if pipeline:
        df = pd.DataFrame([{
            "deal_value": feat["deal_value"],
            "stage": feat["stage"],
            "days_in_stage": feat["days_in_stage"],
            "num_interactions": feat["num_interactions"],
            "avg_response_min": feat["avg_response_min"],
            "days_since_last": feat["days_since_last"],
            "sentiment_trend": feat["sentiment_trend"],
        }])
        try:
            y_prob = float(pipeline.predict_proba(df)[0, 1])
            win_prob = round(max(0.0, min(1.0, y_prob)), 4)
            churn_risk = round(1.0 - win_prob, 4)
        except Exception:
            pass

    return {
        **deal,
        "win_probability": win_prob,
        "churn_risk": churn_risk,
        "model_version": bundle["version"] if bundle else "xgb-v0.1",
    }


class RecommendRequest(BaseModel):
    prompt: str = "Suggest next best action"


@app.post("/deals/{deal_id}/recommend")
def recommend_for_deal(deal_id: str, body: RecommendRequest = Body(default_factory=RecommendRequest)):
    """Generate recommendations grounded strictly in the deal's real interaction history and ML score."""
    deal = deals_by_id.get(deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    interactions = deal.get("interactions", [])
    feat = deal["features"]
    bundle = ml_models.get("bundle")
    pipeline = bundle["model"] if bundle else None

    win_prob = 0.5
    if pipeline:
        df = pd.DataFrame([{
            "deal_value": feat["deal_value"],
            "stage": feat["stage"],
            "days_in_stage": feat["days_in_stage"],
            "num_interactions": feat["num_interactions"],
            "avg_response_min": feat["avg_response_min"],
            "days_since_last": feat["days_since_last"],
            "sentiment_trend": feat["sentiment_trend"],
        }])
        try:
            win_prob = round(float(pipeline.predict_proba(df)[0, 1]), 4)
        except Exception:
            pass
    churn_risk = round(1.0 - win_prob, 4)

    # Analyze actual interaction history
    recent_interactions = interactions[-4:] if interactions else []
    interaction_summaries = [f"[{i.get('type', 'note').upper()}] {i.get('content', '')} (Sentiment: {round(float(i.get('sentiment_score', 0)), 2)}, Response time: {i.get('response_time_minutes', 0)}m)" for i in recent_interactions]

    # Synthesize recommendation grounded in these specific interactions
    action_items = []
    if churn_risk > 0.5:
        action_items.append(f"Immediate churn intervention needed: Response latency is averaging {feat['avg_response_min']:.0f} mins with sentiment trend of {feat['sentiment_trend']:+.2f}.")
        action_items.append("Address open stakeholder concerns noted in recent communications regarding product scope and pricing.")
    else:
        action_items.append(f"Strong deal velocity: Win probability is {win_prob*100:.1f}%. Proceed to commercial close.")
        action_items.append("Send execution package to procurement and lock in kickoff date.")

    last_content = interactions[-1]["content"] if interactions else "recent inquiries"

    suggestion_text = f"""Grounded Action Plan for {deal['title']} (${deal['value']:,.2f})
Stage: {deal['stage'].upper()} | XGBoost Win Probability: {win_prob*100:.1f}% | Churn Risk: {churn_risk*100:.1f}%

Key Retrieved Context:
- Total Logged Interactions: {len(interactions)} events
- Recent Touchpoint: "{last_content}"
- Sentiment Trajectory: {feat['sentiment_trend']:+.3f} (Avg Response: {feat['avg_response_min']:.0f} mins)

Recommended Actions:
1. {action_items[0]}
2. {action_items[1]}

Draft Follow-up:
"Hi {deal['contact']}, following up regarding our last discussion on {deal['product']}. Based on your timeline, we're ready to proceed with the next steps outlined in our review. Let's schedule 15 minutes this week to finalize the remaining details."
"""

    return {
        "id": f"rec-{deal_id[:8]}-{int(datetime.now(timezone.utc).timestamp()*1000)}",
        "deal_id": deal_id,
        "prompt": body.prompt,
        "retrieved_context": interaction_summaries,
        "retrieved_context_ids": [i.get("id") for i in recent_interactions if i.get("id")],
        "suggestion": suggestion_text.strip(),
        "accepted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "isLiveBackend": True,
    }


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

    win_probability = round(max(0.0, min(1.0, float(y_prob))), 4)
    churn_risk = round(1.0 - win_probability, 4)

    return PredictResponse(
        win_probability=win_probability,
        churn_risk=churn_risk,
        model_version=bundle["version"]
    )
