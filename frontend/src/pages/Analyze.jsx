import React, { useState } from 'react';
import {
  Cpu,
  Sparkles,
  Zap,
  RotateCcw,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  BarChart2,
  Clock,
  Layers
} from 'lucide-react';
import InputField from '../components/InputField';
import SelectField from '../components/SelectField';
import SliderField from '../components/SliderField';
import FormSection from '../components/FormSection';
import Button from '../components/Button';
import PredictionCard from '../components/PredictionCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { STAGES } from '../utils/validation';
import { usePrediction } from '../hooks/usePrediction';
import { getSentimentDetails, formatDuration } from '../utils/formatters';
import './Analyze.css';

const DEFAULT_FEATURES = {
  deal_value: 50000,
  stage: 'proposal',
  days_in_stage: 12,
  num_interactions: 8,
  avg_response_min: 320,
  days_since_last: 3,
  sentiment_trend: 0.15,
};

const PRESETS = [
  {
    name: 'High-Intent Proposal',
    description: 'Strong engagement and positive sentiment',
    data: {
      deal_value: 85000,
      stage: 'proposal',
      days_in_stage: 5,
      num_interactions: 15,
      avg_response_min: 45,
      days_since_last: 1,
      sentiment_trend: 0.65,
    },
  },
  {
    name: 'Stalled Negotiation',
    description: 'High value with lagging response and negative drift',
    data: {
      deal_value: 140000,
      stage: 'negotiation',
      days_in_stage: 32,
      num_interactions: 9,
      avg_response_min: 840,
      days_since_last: 16,
      sentiment_trend: -0.45,
    },
  },
  {
    name: 'Early Qualified Lead',
    description: 'Promising start in early qualification',
    data: {
      deal_value: 35000,
      stage: 'qualified',
      days_in_stage: 4,
      num_interactions: 4,
      avg_response_min: 120,
      days_since_last: 2,
      sentiment_trend: 0.20,
    },
  },
  {
    name: 'At-Risk Enterprise',
    description: 'Critical deal with prolonged stagnation',
    data: {
      deal_value: 210000,
      stage: 'proposal',
      days_in_stage: 45,
      num_interactions: 6,
      avg_response_min: 1440,
      days_since_last: 22,
      sentiment_trend: -0.70,
    },
  },
];

export default function Analyze() {
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const {
    loading,
    error,
    result,
    validationErrors,
    executePrediction,
    resetPrediction,
  } = usePrediction();

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFeatures((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value,
    }));
  };

  const handleSliderChange = (e) => {
    setFeatures((prev) => ({
      ...prev,
      sentiment_trend: Number(parseFloat(e.target.value).toFixed(2)),
    }));
  };

  const handlePresetSelect = (preset) => {
    setFeatures(preset.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await executePrediction(features);
  };

  const sentimentInfo = getSentimentDetails(features.sentiment_trend);

  return (
    <div className="page-container analyze-page">
      <div className="container">
        {/* Page Header */}
        <div className="analyze-header">
          <div className="analyze-title-group">
            <span className="badge badge-primary">
              <Cpu size={14} /> ML Inference Engine
            </span>
            <h1 className="analyze-heading">Deal Intelligence & Win Scoring</h1>
            <p className="analyze-subheading">
              Input behavioral CRM telemetry into the calibrated XGBoost binary classifier (xgb-v0.1)
              to predict deal outcome probability and identify churn risk indicators.
            </p>
          </div>

          {/* Quick Presets Bar */}
          <div className="presets-bar glass-card">
            <span className="presets-label">
              <Zap size={14} className="text-primary" /> Load Scenario:
            </span>
            <div className="presets-list">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  className="preset-btn"
                  onClick={() => handlePresetSelect(preset)}
                  title={preset.description}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2-Column Split: Form (Left) | Prediction Result (Right) */}
        <div className="analyze-layout-grid">
          {/* Left Column: Input Form */}
          <div className="analyze-form-col">
            <form onSubmit={handleSubmit} noValidate>
              {/* Section 1: Financial & Stage */}
              <FormSection
                title="Deal Scope & Stage"
                icon={BarChart2}
                description="Contract valuation and current CRM pipeline position."
              >
                <div className="form-row-2">
                  <InputField
                    id="deal_value"
                    name="deal_value"
                    label="Deal Value (USD)"
                    type="number"
                    min="0"
                    step="1000"
                    prefix="$"
                    required
                    value={features.deal_value}
                    onChange={handleInputChange}
                    error={validationErrors.deal_value}
                    description="Total expected pipeline value"
                    placeholder="50000"
                  />

                  <SelectField
                    id="stage"
                    name="stage"
                    label="Current Deal Stage"
                    required
                    value={features.stage}
                    onChange={handleInputChange}
                    options={STAGES}
                    error={validationErrors.stage}
                    description="Pipeline phase according to CRM lifecycle"
                  />
                </div>

                <InputField
                  id="days_in_stage"
                  name="days_in_stage"
                  label="Days in Current Stage"
                  type="number"
                  min="0"
                  step="1"
                  suffix="days"
                  required
                  value={features.days_in_stage}
                  onChange={handleInputChange}
                  error={validationErrors.days_in_stage}
                  description="Number of elapsed days since entering this stage (indicates stagnation risk)"
                />
              </FormSection>

              {/* Section 2: Engagement Velocity */}
              <FormSection
                title="Engagement & Interaction Telemetry"
                icon={Clock}
                description="Communication frequency and prospect response latency."
              >
                <div className="form-row-2">
                  <InputField
                    id="num_interactions"
                    name="num_interactions"
                    label="Total Interactions"
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={features.num_interactions}
                    onChange={handleInputChange}
                    error={validationErrors.num_interactions}
                    description="Logged emails, calls, notes, and demo sessions"
                  />

                  <InputField
                    id="days_since_last"
                    name="days_since_last"
                    label="Days Since Last Contact"
                    type="number"
                    min="0"
                    step="1"
                    suffix="days"
                    required
                    value={features.days_since_last}
                    onChange={handleInputChange}
                    error={validationErrors.days_since_last}
                    description="Recency gap since prospect's latest touchpoint"
                  />
                </div>

                <InputField
                  id="avg_response_min"
                  name="avg_response_min"
                  label="Avg Prospect Response Time"
                  type="number"
                  min="0"
                  step="1"
                  suffix="min"
                  required
                  value={features.avg_response_min}
                  onChange={handleInputChange}
                  error={validationErrors.avg_response_min}
                  description={`Average reply latency (~${formatDuration(features.avg_response_min)})`}
                />
              </FormSection>

              {/* Section 3: Sentiment Dynamics */}
              <FormSection
                title="Communication Sentiment Trend"
                icon={TrendingUp}
                description="Calculated delta between recent and baseline conversation tone."
              >
                <SliderField
                  id="sentiment_trend"
                  name="sentiment_trend"
                  label="Sentiment Trend Index (-1.0 to +1.0)"
                  min={-1.0}
                  max={1.0}
                  step={0.05}
                  value={features.sentiment_trend}
                  onChange={handleSliderChange}
                  displayFormat={(v) => (Number(v) >= 0 ? `+${Number(v).toFixed(2)}` : Number(v).toFixed(2))}
                  badge={
                    <span className={`badge ${sentimentInfo.badgeClass}`}>
                      {sentimentInfo.label}
                    </span>
                  }
                  error={validationErrors.sentiment_trend}
                  description={sentimentInfo.description}
                />
              </FormSection>

              {/* Form Submission Actions */}
              <div className="form-action-bar">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  icon={Zap}
                  id="predict-submit-btn"
                  style={{ flex: 1 }}
                >
                  {loading ? 'Evaluating ML Model...' : 'Calculate Win Probability'}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  icon={RotateCcw}
                  onClick={() => {
                    setFeatures(DEFAULT_FEATURES);
                    resetPrediction();
                  }}
                  disabled={loading}
                >
                  Reset
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column: Prediction Result Display */}
          <div className="analyze-result-col">
            <div className="result-sticky-wrapper">
              {loading && (
                <div className="glass-card result-placeholder-box">
                  <LoadingSpinner
                    size="lg"
                    message="Evaluating XGBoost Model"
                    subtext="Processing 7 telemetry features against calibrated decision thresholds..."
                  />
                </div>
              )}

              {!loading && error && (
                <ErrorMessage
                  title="Inference Error"
                  message={error}
                  onRetry={handleSubmit}
                />
              )}

              {!loading && !error && result && (
                <PredictionCard
                  result={result}
                  onReset={resetPrediction}
                />
              )}

              {!loading && !error && !result && (
                <EmptyState
                  icon={Cpu}
                  title="Ready for Analysis"
                  description="Adjust the 7 telemetry features on the left or click any preset scenario above, then submit to generate real-time calibrated predictions."
                  actionLabel="Run Sample Deal"
                  onAction={() => executePrediction(features)}
                  actionIcon={Zap}
                >
                  <div className="empty-features-preview">
                    <span className="preview-tag">Value: ${Number(features.deal_value).toLocaleString()}</span>
                    <span className="preview-tag">Stage: {features.stage}</span>
                    <span className="preview-tag">Response: {features.avg_response_min}m</span>
                  </div>
                </EmptyState>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
