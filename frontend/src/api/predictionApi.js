// DealSense Real ML Prediction & Analytics API
import { request, ML_API_BASE_URL, API_BASE_URL } from './api';

/**
 * Predict deal win probability & churn risk using the live XGBoost ML Service.
 *
 * Contract:
 * POST /predict
 * Request: { deal_value, stage, days_in_stage, num_interactions, avg_response_min, days_since_last, sentiment_trend }
 * Response: { win_probability, churn_risk, model_version }
 */
export async function predictDeal(features) {
  const payload = {
    deal_value: Number(features.deal_value),
    stage: String(features.stage),
    days_in_stage: parseInt(features.days_in_stage, 10),
    num_interactions: parseInt(features.num_interactions, 10),
    avg_response_min: Number(features.avg_response_min),
    days_since_last: parseInt(features.days_since_last, 10),
    sentiment_trend: Number(features.sentiment_trend),
  };

  const data = await request(`${ML_API_BASE_URL}/predict`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    win_probability: Number(data.win_probability),
    churn_risk: Number(data.churn_risk),
    model_version: data.model_version || 'xgb-v0.1',
    isLiveBackend: true,
  };
}

/**
 * Check ML Service Health
 */
export async function checkMlHealth() {
  try {
    const data = await request(`${ML_API_BASE_URL}/health`, {}, 3000);
    return { ok: true, ...data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Check FastAPI Backend Health
 */
export async function checkBackendHealth() {
  try {
    const data = await request(`${API_BASE_URL}/api/health`, {}, 3000);
    return { ok: true, ...data };
  } catch {
    try {
      const fallback = await request(`${API_BASE_URL}/health`, {}, 3000);
      return { ok: true, ...fallback };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }
}

/**
 * Get real model metrics evaluated on test split
 */
export async function getModelMetrics() {
  return request(`${ML_API_BASE_URL}/metrics`);
}

/**
 * Get aggregated dataset statistics across real CRM opportunities
 */
export async function getDatasetStats() {
  return request(`${ML_API_BASE_URL}/stats`);
}

/**
 * Fetch real CRM deals loaded from actual CRM pipeline dataset
 */
export async function getRealDeals(limit = 50, stage = null) {
  const query = new URLSearchParams();
  if (limit) query.set('limit', limit);
  if (stage) query.set('stage', stage);
  const qs = query.toString() ? `?${query.toString()}` : '';
  return request(`${ML_API_BASE_URL}/deals${qs}`);
}

/**
 * Fetch single real CRM deal by ID with full interaction log
 */
export async function getRealDealById(dealId) {
  return request(`${ML_API_BASE_URL}/deals/${dealId}`);
}

/**
 * Get saved Deal Score for a specific deal from Postgres via Backend API
 */
export async function getDealScore(dealId) {
  return request(`${API_BASE_URL}/api/v1/deals/${dealId}/score`);
}

/**
 * Trigger backend re-computation of deal score
 */
export async function generateDealScore(dealId) {
  return request(`${API_BASE_URL}/api/v1/deals/${dealId}/score`, {
    method: 'POST',
  });
}
