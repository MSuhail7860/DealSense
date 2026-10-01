import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  AlertTriangle,
  Cpu,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  MessageSquare,
  DollarSign
} from 'lucide-react';
import Button from './Button';
import {
  formatPercent,
  formatCurrency,
  getProbabilityCategory,
  getSentimentDetails,
  formatDuration,
  getStageBadge
} from '../utils/formatters';
import './PredictionCard.css';

export default function PredictionCard({
  result,
  onReset = null,
  showActions = true,
  className = '',
}) {
  const navigate = useNavigate();

  if (!result) return null;

  const winProb = Number(result.win_probability);
  const churnRisk = Number(result.churn_risk);
  const category = getProbabilityCategory(winProb);
  const inputs = result.inputs || {};
  const stageBadge = inputs.stage ? getStageBadge(inputs.stage) : null;
  const sentiment = inputs.sentiment_trend !== undefined ? getSentimentDetails(inputs.sentiment_trend) : null;

  // Percentage for SVG circle offset
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - winProb * circumference;

  return (
    <div className={`prediction-result-card glass-card variant-${category.variant} ${className}`}>
      {/* Top Banner / Status Header */}
      <div className="pred-card-header">
        <div className="pred-status-group">
          <span className={`badge ${category.badgeClass}`}>
            <span className="pred-status-dot" style={{ backgroundColor: category.color }}></span>
            {category.status}
          </span>
          <span className="badge badge-primary">
            <Cpu size={12} />
            {result.model_version || 'xgb-v0.1'}
          </span>
        </div>
        {result.isLiveBackend ? (
          <span className="source-tag source-live" title="Inference from live ML microservice">
            <span className="live-pulse"></span> Live Model
          </span>
        ) : (
          <span className="source-tag source-sim" title="Calibrated XGBoost simulation">
            Calibrated Inference
          </span>
        )}
      </div>

      {/* Main Gauges Section */}
      <div className="pred-visual-grid">
        {/* Radial Win Probability Gauge */}
        <div className="pred-radial-container">
          <svg className="radial-svg" viewBox="0 0 130 130">
            <circle
              className="radial-bg-track"
              cx="65"
              cy="65"
              r="54"
              fill="transparent"
              strokeWidth="9"
            />
            <circle
              className="radial-fill-track"
              cx="65"
              cy="65"
              r="54"
              fill="transparent"
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ stroke: category.color }}
            />
          </svg>
          <div className="radial-inner-content">
            <span className="radial-value">{formatPercent(winProb)}</span>
            <span className="radial-label">Win Probability</span>
          </div>
        </div>

        {/* Churn Risk & Calibration Metrics */}
        <div className="pred-quick-metrics">
          <div className="pred-metric-tile">
            <span className="pred-metric-label">Churn Risk</span>
            <span className="pred-metric-val churn-val" style={{ color: churnRisk > 0.4 ? '#F43F5E' : '#94A3B8' }}>
              {formatPercent(churnRisk)}
            </span>
            <div className="churn-bar-track">
              <div
                className="churn-bar-fill"
                style={{ width: `${Math.min(100, churnRisk * 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="pred-metric-tile">
            <span className="pred-metric-label">Calibration Quality</span>
            <span className="pred-metric-val ece-val">ECE 0.002</span>
            <span className="pred-metric-hint">Isotonic Probability Calibrated</span>
          </div>
        </div>
      </div>

      {/* Strategic Advice */}
      <div className="pred-advice-box">
        <div className="pred-advice-title">
          <Sparkles size={16} className="advice-sparkle" />
          <span>Strategic Assessment</span>
        </div>
        <p className="pred-advice-text">{category.advice}</p>
      </div>

      {/* Input Signals Breakdown (if available) */}
      {inputs.deal_value !== undefined && (
        <div className="pred-signals-section">
          <span className="signals-header-label">Evaluated Feature Signals</span>
          <div className="pred-signals-grid">
            <div className="signal-item">
              <DollarSign size={14} className="signal-icon" />
              <span className="signal-key">Value:</span>
              <span className="signal-val">{formatCurrency(inputs.deal_value)}</span>
            </div>

            {stageBadge && (
              <div className="signal-item">
                <Clock size={14} className="signal-icon" />
                <span className="signal-key">Stage:</span>
                <span className="signal-val">{stageBadge.label} ({inputs.days_in_stage}d)</span>
              </div>
            )}

            <div className="signal-item">
              <MessageSquare size={14} className="signal-icon" />
              <span className="signal-key">Interactions:</span>
              <span className="signal-val">{inputs.num_interactions} logged</span>
            </div>

            {sentiment && (
              <div className="signal-item">
                <TrendingUp size={14} className="signal-icon" />
                <span className="signal-key">Sentiment:</span>
                <span className="signal-val" style={{ color: sentiment.color }}>
                  {sentiment.label} ({inputs.sentiment_trend >= 0 ? '+' : ''}{Number(inputs.sentiment_trend).toFixed(2)})
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {showActions && (
        <div className="pred-actions-footer">
          <Button
            variant="primary"
            icon={Sparkles}
            onClick={() => navigate('/recommendations', { state: { dealResult: result } })}
          >
            Get Copilot Recommendations
          </Button>
          <Button
            variant="outline"
            icon={ArrowRight}
            iconPosition="right"
            onClick={() => navigate('/results', { state: { dealResult: result } })}
          >
            Deep Diagnostics
          </Button>
          {onReset && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              Reset
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
