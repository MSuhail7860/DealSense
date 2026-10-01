import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Zap,
  RotateCcw,
  BarChart2,
  Clock,
  Layers,
  Database
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
import { getRealDeals } from '../api/predictionApi';
import { getSentimentDetails, formatDuration, formatCurrency } from '../utils/formatters';
import './Analyze.css';

const DEFAULT_FEATURES = {
  deal_value: 36951.86,
  stage: 'lead',
  days_in_stage: 20,
  num_interactions: 14,
  avg_response_min: 476,
  days_since_last: 1,
  sentiment_trend: -0.12,
};

export default function Analyze() {
  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [realDeals, setRealDeals] = useState([]);
  const [selectedDealId, setSelectedDealId] = useState('');
  const [loadingDeals, setLoadingDeals] = useState(true);

  const {
    loading,
    error,
    result,
    validationErrors,
    executePrediction,
    resetPrediction,
  } = usePrediction();

  // Fetch real deals from live ML / CRM service
  useEffect(() => {
    let mounted = true;
    async function loadDeals() {
      try {
        setLoadingDeals(true);
        const data = await getRealDeals(40);
        if (mounted && Array.isArray(data) && data.length > 0) {
          setRealDeals(data);
          // Set first deal as initial selection
          const first = data[0];
          setSelectedDealId(first.id);
          if (first.features) {
            setFeatures({
              deal_value: first.features.deal_value || first.value,
              stage: first.features.stage || first.stage,
              days_in_stage: first.features.days_in_stage ?? 10,
              num_interactions: first.features.num_interactions ?? first.num_interactions,
              avg_response_min: Math.round(first.features.avg_response_min ?? 200),
              days_since_last: first.features.days_since_last ?? 2,
              sentiment_trend: Number(parseFloat(first.features.sentiment_trend ?? 0).toFixed(2)),
            });
          }
        }
      } catch (err) {
        console.error('Failed to load real deals:', err);
      } finally {
        if (mounted) setLoadingDeals(false);
      }
    }
    loadDeals();
    return () => { mounted = false; };
  }, []);

  const handleSelectRealDeal = (e) => {
    const dealId = e.target.value;
    setSelectedDealId(dealId);
    const deal = realDeals.find((d) => d.id === dealId);
    if (deal && deal.features) {
      setFeatures({
        deal_value: deal.features.deal_value || deal.value,
        stage: deal.features.stage || deal.stage,
        days_in_stage: deal.features.days_in_stage ?? 10,
        num_interactions: deal.features.num_interactions ?? deal.num_interactions,
        avg_response_min: Math.round(deal.features.avg_response_min ?? 200),
        days_since_last: deal.features.days_since_last ?? 2,
        sentiment_trend: Number(parseFloat(deal.features.sentiment_trend ?? 0).toFixed(2)),
      });
      resetPrediction();
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    await executePrediction(features);
  };

  const sentimentInfo = getSentimentDetails(features.sentiment_trend);
  const activeDeal = realDeals.find((d) => d.id === selectedDealId);

  return (
    <div className="page-container analyze-page">
      <div className="container">
        {/* Page Header */}
        <div className="analyze-header">
          <div className="analyze-title-group">
            <span className="badge badge-primary">
              <Cpu size={14} /> ML Inference Engine (xgb-v0.1)
            </span>
            <h1 className="analyze-heading">Deal Intelligence & Win Scoring</h1>
            <p className="analyze-subheading">
              Evaluating real CRM opportunities using the trained XGBoost binary classification model.
              Select any live opportunity from the dataset or adjust behavioral features for scenario scoring.
            </p>
          </div>

          {/* Real Opportunity Selector Bar */}
          <div className="presets-bar glass-card">
            <span className="presets-label">
              <Database size={15} className="text-primary" /> Live CRM Opportunity:
            </span>
            {loadingDeals ? (
              <span className="text-secondary text-sm">Loading dataset opportunities from ML service...</span>
            ) : realDeals.length > 0 ? (
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                <select
                  id="real-deal-selector"
                  aria-label="Select live CRM opportunity from dataset"
                  value={selectedDealId}
                  onChange={handleSelectRealDeal}
                  className="form-select"
                  style={{
                    maxWidth: '480px',
                    width: '100%',
                    minHeight: '44px',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    borderColor: 'var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  {realDeals.map((deal) => (
                    <option key={deal.id} value={deal.id}>
                      {deal.title} ({formatCurrency(deal.value)} • {deal.stage.toUpperCase()})
                    </option>
                  ))}
                </select>
                {activeDeal && (
                  <span className="badge badge-neutral" style={{ fontSize: '0.8rem' }}>
                    UUID: {activeDeal.id.slice(0, 13)}... • {activeDeal.num_interactions} Real Interactions Logged
                  </span>
                )}
              </div>
            ) : (
              <span className="text-secondary text-sm">Loaded default feature telemetry.</span>
            )}
          </div>
        </div>

        {/* Selected Deal Context Highlight */}
        {activeDeal && activeDeal.last_interaction && (
          <div className="glass-card" style={{ padding: '0.875rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
            <Clock size={16} className="text-primary" />
            <span className="text-secondary text-sm">
              <strong style={{ color: 'var(--text-primary)' }}>Most Recent Touchpoint:</strong> "{activeDeal.last_interaction.content}" ({activeDeal.last_interaction.type.toUpperCase()}, {new Date(activeDeal.last_interaction.created_at).toLocaleDateString()})
            </span>
          </div>
        )}

        {/* 2-Column Split: Form (Left) | Prediction Result (Right) */}
        <div className="analyze-layout-grid">
          {/* Left Column: Input Form */}
          <div className="analyze-form-col">
            <form onSubmit={handleSubmit} noValidate>
              {/* Section 1: Financial & Stage */}
              <FormSection
                title="Deal Scope & Stage"
                icon={BarChart2}
                description="Live opportunity valuation and CRM pipeline lifecycle position."
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
                description="Communication frequency and prospect response latency measured from dataset."
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
                    suffix="days ago"
                    required
                    value={features.days_since_last}
                    onChange={handleInputChange}
                    error={validationErrors.days_since_last}
                    description="Recency of last recorded interaction"
                  />
                </div>

                <InputField
                  id="avg_response_min"
                  name="avg_response_min"
                  label="Average Response Latency"
                  type="number"
                  min="0"
                  step="10"
                  suffix="mins"
                  required
                  value={features.avg_response_min}
                  onChange={handleInputChange}
                  error={validationErrors.avg_response_min}
                  description={`Average customer reply time (${formatDuration(features.avg_response_min || 0)})`}
                />
              </FormSection>

              {/* Section 3: Sentiment Dynamics */}
              <FormSection
                title="Sentiment Progression"
                icon={Layers}
                description="Drift in prospect sentiment derived across chronological interactions."
              >
                <SliderField
                  id="sentiment_trend"
                  name="sentiment_trend"
                  label="Sentiment Drift Trend"
                  min="-1.0"
                  max="1.0"
                  step="0.05"
                  value={features.sentiment_trend}
                  onChange={handleSliderChange}
                  leftLabel="-1.0 (Critical Churn)"
                  centerLabel="0.0 (Neutral)"
                  rightLabel="+1.0 (Strong Advocacy)"
                />

                <div
                  className="sentiment-feedback-box"
                  style={{
                    borderLeftColor: sentimentInfo.color,
                    background: sentimentInfo.bgColor,
                  }}
                >
                  <div className="sentiment-feedback-header">
                    <span
                      className="sentiment-status-dot"
                      style={{ background: sentimentInfo.color }}
                    />
                    <strong style={{ color: sentimentInfo.color }}>
                      {sentimentInfo.label} ({features.sentiment_trend > 0 ? `+${features.sentiment_trend}` : features.sentiment_trend})
                    </strong>
                  </div>
                  <p className="sentiment-feedback-desc">{sentimentInfo.description}</p>
                </div>
              </FormSection>

              {/* Form Action Controls */}
              <div className="form-actions-group">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  icon={Zap}
                >
                  {loading ? 'Evaluating Model Inferences...' : 'Generate Live ML Prediction'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    resetPrediction();
                    if (activeDeal && activeDeal.features) {
                      setFeatures({
                        deal_value: activeDeal.features.deal_value || activeDeal.value,
                        stage: activeDeal.features.stage || activeDeal.stage,
                        days_in_stage: activeDeal.features.days_in_stage ?? 10,
                        num_interactions: activeDeal.features.num_interactions ?? activeDeal.num_interactions,
                        avg_response_min: Math.round(activeDeal.features.avg_response_min ?? 200),
                        days_since_last: activeDeal.features.days_since_last ?? 2,
                        sentiment_trend: Number(parseFloat(activeDeal.features.sentiment_trend ?? 0).toFixed(2)),
                      });
                    } else {
                      setFeatures(DEFAULT_FEATURES);
                    }
                  }}
                  icon={RotateCcw}
                  disabled={loading}
                >
                  Reset Features
                </Button>
              </div>
            </form>
          </div>

          {/* Right Column: Prediction Output State */}
          <div className="analyze-result-col">
            {error && (
              <ErrorMessage
                title="ML Inference Error"
                message={error}
                onRetry={handleSubmit}
              />
            )}

            {loading && (
              <div className="result-loading-card glass-card">
                <LoadingSpinner size="lg" text="Calling XGBoost ML service pipeline on port 8001..." />
              </div>
            )}

            {!loading && !error && result && (
              <PredictionCard
                result={result}
                prediction={result}
                features={features}
                onReset={resetPrediction}
              />
            )}

            {!loading && !error && !result && (
              <EmptyState
                icon={Cpu}
                title="Awaiting Model Evaluation"
                description="Click 'Generate Live ML Prediction' to run the active feature vector through the trained XGBoost model."
                actionLabel="Evaluate Current Features"
                onAction={handleSubmit}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
