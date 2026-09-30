import pytest
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

sys.path.append(str(Path(__file__).resolve().parent.parent))
from training.features import calculate_deal_features, build_features

def test_calculate_deal_features_empty_interactions():
    now = datetime(2026, 10, 1, 12, 0, 0, tzinfo=timezone.utc)
    deal = {
        "id": "deal-1",
        "value": 25000.0,
        "stage": "qualified",
        "created_at": (now - timedelta(days=10)).isoformat()
    }
    interactions = []
    
    features = calculate_deal_features(deal, interactions, now=now)
    
    assert features["deal_id"] == "deal-1"
    assert features["deal_value"] == 25000.0
    assert features["stage"] == "qualified"
    assert features["days_in_stage"] == 10
    assert features["num_interactions"] == 0
    assert features["avg_response_min"] == 0.0
    assert features["days_since_last"] == 0
    assert features["sentiment_trend"] == 0.0

def test_calculate_deal_features_single_interaction():
    now = datetime(2026, 10, 1, 12, 0, 0, tzinfo=timezone.utc)
    deal = {
        "id": "deal-2",
        "value": 50000.0,
        "stage": "proposal",
        "created_at": (now - timedelta(days=5)).isoformat()
    }
    interactions = [
        {
            "id": "int-1",
            "created_at": (now - timedelta(days=2)).isoformat(),
            "response_time_minutes": 120,
            "sentiment_score": 0.4
        }
    ]
    
    features = calculate_deal_features(deal, interactions, now=now)
    
    assert features["deal_value"] == 50000.0
    assert features["stage"] == "proposal"
    assert features["num_interactions"] == 1
    assert features["avg_response_min"] == 120.0
    assert features["days_since_last"] == 2
    assert features["sentiment_trend"] == 0.0  # Needs >= 2 sentiments for trend

def test_calculate_deal_features_multiple_interactions_and_trend():
    now = datetime(2026, 10, 1, 12, 0, 0, tzinfo=timezone.utc)
    deal = {
        "id": "deal-3",
        "value": 10000.0,
        "stage": "negotiation",
        "created_at": (now - timedelta(days=20)).isoformat()
    }
    # Provide out of order to verify sorting by created_at ascending
    interactions = [
        {
            "id": "int-2",
            "created_at": (now - timedelta(days=5)).isoformat(),
            "response_time_minutes": 60,
            "sentiment_score": 0.6
        },
        {
            "id": "int-1",
            "created_at": (now - timedelta(days=15)).isoformat(),
            "response_time_minutes": 180,
            "sentiment_score": -0.2
        },
        {
            "id": "int-3",
            "created_at": (now - timedelta(days=1)).isoformat(),
            "response_time_minutes": 90,
            "sentiment_score": 0.8
        }
    ]
    
    features = calculate_deal_features(deal, interactions, now=now)
    
    assert features["num_interactions"] == 3
    assert features["avg_response_min"] == pytest.approx((180 + 60 + 90) / 3.0)
    assert features["days_since_last"] == 1
    # trend = last (0.8) - first (-0.2) = 1.0
    assert features["sentiment_trend"] == pytest.approx(1.0)

def test_calculate_deal_features_with_nulls():
    now = datetime(2026, 10, 1, 12, 0, 0, tzinfo=timezone.utc)
    deal = {
        "id": "deal-4",
        "value": 75000.0,
        "stage": "lead",
        "created_at": (now - timedelta(days=8)).isoformat()
    }
    interactions = [
        {
            "id": "int-1",
            "created_at": (now - timedelta(days=6)).isoformat(),
            "response_time_minutes": None,
            "sentiment_score": 0.2
        },
        {
            "id": "int-2",
            "created_at": (now - timedelta(days=3)).isoformat(),
            "response_time_minutes": 45,
            "sentiment_score": None
        }
    ]
    
    features = calculate_deal_features(deal, interactions, now=now)
    
    assert features["avg_response_min"] == 45.0
    assert features["sentiment_trend"] == 0.0  # Only 1 non-null sentiment

def test_build_features_with_labels():
    import pandas as pd
    now = datetime.now(timezone.utc)
    deals_list = [
        {
            "id": "d1",
            "value": 1000.0,
            "stage": "lead",
            "created_at": now.isoformat(),
            "interactions": []
        },
        {
            "id": "d2",
            "value": 2000.0,
            "stage": "won",
            "created_at": now.isoformat(),
            "interactions": []
        }
    ]
    labels_df = pd.DataFrame([
        {"deal_id": "d1", "is_won": 0},
        {"deal_id": "d2", "is_won": 1}
    ])
    
    df = build_features(deals_list, labels_df)
    assert len(df) == 2
    assert "is_won" in df.columns
    assert list(df["is_won"]) == [0, 1]
