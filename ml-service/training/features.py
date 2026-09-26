import pandas as pd
import numpy as np
from datetime import datetime, timezone
from dateutil.parser import parse

def calculate_deal_features(deal: dict, interactions: list[dict], now: datetime = None) -> dict:
    if now is None:
        now = datetime.now(timezone.utc)
    
    # Sort interactions by created_at ascending
    interactions = sorted(interactions, key=lambda x: parse(x["created_at"]))
    
    deal_value = float(deal.get("value", 0.0))
    stage = str(deal.get("stage", "lead"))
    
    created_at = parse(deal["created_at"])
    days_in_stage = max(0, (now - created_at).days)
    
    num_interactions = len(interactions)
    
    response_times = [
        int(i["response_time_minutes"]) for i in interactions 
        if i.get("response_time_minutes") is not None
    ]
    
    avg_response_min = sum(response_times) / len(response_times) if response_times else 0.0
    
    if interactions:
        last_created_at = parse(interactions[-1]["created_at"])
        days_since_last = max(0, (now - last_created_at).days)
    else:
        days_since_last = 0
        
    sentiments = [
        float(i["sentiment_score"]) for i in interactions
        if i.get("sentiment_score") is not None
    ]
    
    if len(sentiments) >= 2:
        sentiment_trend = sentiments[-1] - sentiments[0]
    else:
        sentiment_trend = 0.0
        
    return {
        "deal_id": deal.get("id"),
        "deal_value": deal_value,
        "stage": stage,
        "days_in_stage": days_in_stage,
        "num_interactions": num_interactions,
        "avg_response_min": avg_response_min,
        "days_since_last": days_since_last,
        "sentiment_trend": sentiment_trend,
    }

def build_features(deals_list, labels_df=None):
    """
    deals_list: list of dicts from synthetic JSON or parsed CSV
    labels_df: optional DataFrame with deal_id and is_won
    """
    now = datetime.now(timezone.utc)
    features_list = []
    
    for deal in deals_list:
        interactions = deal.get("interactions", [])
        features = calculate_deal_features(deal, interactions, now=now)
        features_list.append(features)
        
    df = pd.DataFrame(features_list)
    
    if labels_df is not None:
        df = df.merge(labels_df, on="deal_id", how="left")
        
    return df
