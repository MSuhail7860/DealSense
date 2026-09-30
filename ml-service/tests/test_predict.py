import pytest
import time
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "model_version" in data

def test_predict_standard(client):
    payload = {
        "deal_value": 50000.0,
        "stage": "proposal",
        "days_in_stage": 12,
        "num_interactions": 8,
        "avg_response_min": 320.0,
        "days_since_last": 3,
        "sentiment_trend": -0.2
    }
    
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    
    data = response.json()
    assert "win_probability" in data
    assert "churn_risk" in data
    assert "model_version" in data
    
    assert 0.0 <= data["win_probability"] <= 1.0
    assert 0.0 <= data["churn_risk"] <= 1.0
    assert pytest.approx(data["win_probability"] + data["churn_risk"], abs=1e-5) == 1.0

def test_predict_zero_interactions(client):
    # Edge case: newly created lead with 0 interactions
    payload = {
        "deal_value": 25000.0,
        "stage": "lead",
        "days_in_stage": 0,
        "num_interactions": 0,
        "avg_response_min": 0.0,
        "days_since_last": 0,
        "sentiment_trend": 0.0
    }
    
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert 0.0 <= data["win_probability"] <= 1.0
    assert not (data["win_probability"] != data["win_probability"]) # not NaN

def test_predict_closed_stages(client):
    # Audit scoring for won and lost stages
    for stage in ["won", "lost"]:
        payload = {
            "deal_value": 30000.0,
            "stage": stage,
            "days_in_stage": 20,
            "num_interactions": 5,
            "avg_response_min": 100.0,
            "days_since_last": 1,
            "sentiment_trend": 0.5
        }
        response = client.post("/predict", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert 0.0 <= data["win_probability"] <= 1.0

def test_predict_unseen_stage(client):
    # Handled safely by one-hot encoder
    payload = {
        "deal_value": 15000.0,
        "stage": "discovery_call",
        "days_in_stage": 5,
        "num_interactions": 2,
        "avg_response_min": 60.0,
        "days_since_last": 2,
        "sentiment_trend": 0.1
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert 0.0 <= data["win_probability"] <= 1.0

def test_predict_extreme_values(client):
    # High deal value and large stalled gap
    payload = {
        "deal_value": 5000000.0,
        "stage": "negotiation",
        "days_in_stage": 180,
        "num_interactions": 50,
        "avg_response_min": 1440.0,
        "days_since_last": 45,
        "sentiment_trend": -1.5
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert 0.0 <= data["win_probability"] <= 1.0

def test_predict_latency(client):
    payload = {
        "deal_value": 45000.0,
        "stage": "proposal",
        "days_in_stage": 10,
        "num_interactions": 6,
        "avg_response_min": 150.0,
        "days_since_last": 2,
        "sentiment_trend": 0.3
    }
    
    # Warm up
    client.post("/predict", json=payload)
    
    # Run 50 iterations and measure p95 latency
    latencies = []
    for _ in range(50):
        t0 = time.perf_counter()
        resp = client.post("/predict", json=payload)
        t1 = time.perf_counter()
        assert resp.status_code == 200
        latencies.append((t1 - t0) * 1000)
        
    latencies.sort()
    p95 = latencies[int(len(latencies) * 0.95)]
    print(f"p95 latency: {p95:.2f}ms")
    assert p95 < 200.0, f"p95 latency {p95:.2f}ms exceeds 200ms gate"
