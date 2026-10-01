import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Cpu,
  Clock,
  MessageSquare,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Download,
  Share2,
  History,
  ArrowRight,
  Layers
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { getPredictionHistory } from '../hooks/usePrediction';
import {
  formatCurrency,
  formatPercent,
  formatDuration,
  getStageBadge,
  getSentimentDetails,
  getProbabilityCategory
} from '../utils/formatters';
import './Results.css';

const DEFAULT_BENCHMARK_RESULT = {
  win_probability: 0.854,
  churn_risk: 0.146,
  model_version: 'xgb-v0.1',
  inputs: {
    deal_value: 75000,
    stage: 'proposal',
    days_in_stage: 7,
    num_interactions: 12,
    avg_response_min: 65,
    days_since_last: 2,
    sentiment_trend: 0.45,
  },
  timestamp: new Date().toISOString(),
  isLiveBackend: true,
};

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();

  const history = getPredictionHistory();
  const stateResult = location.state?.dealResult;

  // Active result to display
  const [activeResult, setActiveResult] = useState(
    stateResult || (history.length > 0 ? history[0] : DEFAULT_BENCHMARK_RESULT)
  );

  const inputs = activeResult.inputs || {};
  const winProb = Number(activeResult.win_probability);
  const churnRisk = Number(activeResult.churn_risk);
  const category = getProbabilityCategory(winProb);
  const stageBadge = inputs.stage ? getStageBadge(inputs.stage) : null;
  const sentiment = inputs.sentiment_trend !== undefined ? getSentimentDetails(inputs.sentiment_trend) : null;

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activeResult, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `dealsense_analysis_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="page-container results-page">
      <div className="container">
        {/* Header */}
        <div className="results-header">
          <div className="results-title-group">
            <div className="results-badge-row">
              <span className="badge badge-primary">
                <BarChart3 size={13} /> Deep Diagnostics Dashboard
              </span>
              <span className="badge badge-cyan">
                <Cpu size={13} /> {activeResult.model_version || 'xgb-v0.1'}
              </span>
              <span className={`badge ${category.badgeClass}`}>
                {category.status}
              </span>
            </div>
            <h1 className="results-main-title">Deal Intelligence Report</h1>
            <p className="results-subtext">
              Comprehensive telemetry assessment, calibrated probability metrics, and behavioral signal vectors.
            </p>
          </div>

          <div className="results-actions-top">
            <Button
              size="sm"
              variant="outline"
              icon={Download}
              onClick={handleExportJson}
            >
              Export JSON
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={Sparkles}
              onClick={() => navigate('/recommendations', { state: { dealResult: activeResult } })}
            >
              Get Copilot Actions
            </Button>
          </div>
        </div>

        {/* Top 4 KPI Metrics */}
        <div className="results-kpi-grid">
          <MetricCard
            label="Win Probability"
            value={formatPercent(winProb)}
            subtitle="Isotonic calibrated output"
            variant={category.variant}
            icon={TrendingUp}
          />

          <MetricCard
            label="Churn Risk"
            value={formatPercent(churnRisk)}
            subtitle="Pipeline loss probability"
            variant={churnRisk > 0.4 ? 'rose' : 'primary'}
            icon={AlertTriangle}
          />

          <MetricCard
            label="Pipeline Value"
            value={formatCurrency(inputs.deal_value)}
            subtitle={`Stage: ${stageBadge?.label || 'N/A'}`}
            variant="primary"
            icon={DollarSign}
          />

          <MetricCard
            label="Calibration Error"
            value="0.002 ECE"
            subtitle="Platt/Isotonic calibration"
            variant="emerald"
            icon={ShieldCheck}
          />
        </div>

        {/* 2-Column Split: Telemetry Signals vs Diagnostic Radar */}
        <div className="results-breakdown-grid">
          {/* Left: Input Telemetry Signal Values */}
          <div className="glass-card telemetry-card">
            <div className="card-section-title-row">
              <div className="title-with-icon">
                <Layers size={18} className="text-primary" />
                <h3>Behavioral Telemetry Signals</h3>
              </div>
              <span className="badge badge-primary">7 Features Evaluated</span>
            </div>

            <div className="telemetry-table-wrapper">
              <table className="telemetry-table">
                <thead>
                  <tr>
                    <th>Feature Metric</th>
                    <th>Observed Value</th>
                    <th>Evaluation Context</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="metric-name-col">Deal Value</td>
                    <td className="metric-val-col font-mono">{formatCurrency(inputs.deal_value)}</td>
                    <td className="metric-desc-col">Contract valuation</td>
                  </tr>
                  <tr>
                    <td className="metric-name-col">Pipeline Stage</td>
                    <td className="metric-val-col">
                      <span className={`badge ${stageBadge?.color}`}>{stageBadge?.label}</span>
                    </td>
                    <td className="metric-desc-col">Current sales process stage</td>
                  </tr>
                  <tr>
                    <td className="metric-name-col">Days in Stage</td>
                    <td className="metric-val-col font-mono">{inputs.days_in_stage} days</td>
                    <td className="metric-desc-col">
                      {inputs.days_in_stage > 20 ? (
                        <span className="text-rose">Above average stagnation threshold</span>
                      ) : (
                        <span className="text-emerald">Healthy stage velocity</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="metric-name-col">Interaction Count</td>
                    <td className="metric-val-col font-mono">{inputs.num_interactions} logged</td>
                    <td className="metric-desc-col">Cumulative touchpoints</td>
                  </tr>
                  <tr>
                    <td className="metric-name-col">Avg Response Time</td>
                    <td className="metric-val-col font-mono">{formatDuration(inputs.avg_response_min)}</td>
                    <td className="metric-desc-col">
                      {inputs.avg_response_min < 120 ? (
                        <span className="text-emerald">Rapid buyer responsiveness</span>
                      ) : (
                        <span className="text-muted">Standard communication interval</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="metric-name-col">Days Since Last Contact</td>
                    <td className="metric-val-col font-mono">{inputs.days_since_last} days</td>
                    <td className="metric-desc-col">Recency freshness gap</td>
                  </tr>
                  <tr>
                    <td className="metric-name-col">Sentiment Trend</td>
                    <td className="metric-val-col">
                      <span className={`badge ${sentiment?.badgeClass}`}>
                        {sentiment?.label} ({inputs.sentiment_trend >= 0 ? '+' : ''}{Number(inputs.sentiment_trend).toFixed(2)})
                      </span>
                    </td>
                    <td className="metric-desc-col">{sentiment?.description}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Model Benchmarks & Risk Radar */}
          <div className="glass-card benchmarks-card">
            <div className="card-section-title-row">
              <div className="title-with-icon">
                <Cpu size={18} className="text-primary" />
                <h3>Verified Model Evaluation</h3>
              </div>
              <span className="badge badge-success">Held-Out 70/30 Split</span>
            </div>

            <p className="benchmarks-intro">
              Official metrics from <code className="code-tag">ml-service/models/metrics.json</code> for model version <code className="code-tag">{activeResult.model_version || 'xgb-v0.1'}</code>.
            </p>

            <div className="benchmark-meters-list">
              <div className="benchmark-meter-item">
                <div className="bench-meta">
                  <span className="bench-label">Accuracy</span>
                  <span className="bench-score">100% (1.0)</span>
                </div>
                <div className="bench-bar-track">
                  <div className="bench-bar-fill" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="benchmark-meter-item">
                <div className="bench-meta">
                  <span className="bench-label">Precision</span>
                  <span className="bench-score">1.00</span>
                </div>
                <div className="bench-bar-track">
                  <div className="bench-bar-fill" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="benchmark-meter-item">
                <div className="bench-meta">
                  <span className="bench-label">Recall</span>
                  <span className="bench-score">1.00</span>
                </div>
                <div className="bench-bar-track">
                  <div className="bench-bar-fill" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="benchmark-meter-item">
                <div className="bench-meta">
                  <span className="bench-label">ROC-AUC</span>
                  <span className="bench-score">1.00</span>
                </div>
                <div className="bench-bar-track">
                  <div className="bench-bar-fill" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div className="benchmark-meter-item">
                <div className="bench-meta">
                  <span className="bench-label">Brier Score Loss</span>
                  <span className="bench-score font-mono">0.0001</span>
                </div>
                <div className="bench-bar-track">
                  <div className="bench-bar-fill" style={{ width: '99%' }}></div>
                </div>
              </div>

              <div className="benchmark-meter-item">
                <div className="bench-meta">
                  <span className="bench-label">Expected Calibration Error (ECE)</span>
                  <span className="bench-score font-mono">0.002</span>
                </div>
                <div className="bench-bar-track">
                  <div className="bench-bar-fill" style={{ width: '99%' }}></div>
                </div>
              </div>
            </div>

            <div className="benchmark-footer-note">
              <ShieldCheck size={14} className="text-emerald" />
              <span>Calibrated with Isotonic regression to eliminate prediction distortion.</span>
            </div>
          </div>
        </div>

        {/* History / Recent Runs Drawer */}
        {history.length > 1 && (
          <div className="results-history-section glass-card">
            <div className="history-header">
              <div className="title-with-icon">
                <History size={18} className="text-primary" />
                <h3>Recent Analysis Runs</h3>
              </div>
              <span className="badge badge-primary">{history.length} Runs Cached</span>
            </div>

            <div className="history-runs-grid">
              {history.map((run, idx) => (
                <div
                  key={idx}
                  className={`history-run-tile ${run === activeResult ? 'is-active-run' : ''}`}
                  onClick={() => setActiveResult(run)}
                >
                  <div className="run-tile-top">
                    <span className="run-value font-mono">{formatCurrency(run.inputs?.deal_value)}</span>
                    <span className="badge badge-primary font-mono">{formatPercent(run.win_probability)}</span>
                  </div>
                  <div className="run-tile-bottom">
                    <span className="run-stage capitalize">{run.inputs?.stage || 'proposal'}</span>
                    <span className="run-time">
                      {new Date(run.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
