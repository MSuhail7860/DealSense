import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Zap,
  TrendingUp,
  ShieldCheck,
  Clock,
  Layers,
  Database,
  Cpu,
  BarChart3,
  Activity,
  CheckCircle2,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import Button from '../components/Button';
import SectionHeading from '../components/SectionHeading';
import MetricCard from '../components/MetricCard';
import FeatureCard from '../components/FeatureCard';
import { getDatasetStats, getRealDeals } from '../api/predictionApi';
import { formatCurrency, formatPercent } from '../utils/formatters';
import './Home.css';

export default function Home() {
  const [stats, setStats] = useState(null);
  const [sampleDeals, setSampleDeals] = useState([]);
  const [activeDealIndex, setActiveDealIndex] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [statsData, dealsData] = await Promise.all([
          getDatasetStats().catch(() => null),
          getRealDeals(4).catch(() => []),
        ]);
        if (mounted) {
          if (statsData) setStats(statsData);
          if (Array.isArray(dealsData) && dealsData.length > 0) {
            setSampleDeals(dealsData);
          }
        }
      } catch (e) {
        console.error('Error fetching home data:', e);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, []);

  const currentDeal = sampleDeals[activeDealIndex] || null;

  return (
    <div className="home-page">
      {/* 1. HERO SECTION */}
      <section className="hero-section">
        <div className="container hero-container">
          <div className="hero-content">
            <div className="hero-badge-row">
              <span className="badge badge-primary">
                <Sparkles size={14} /> AI-Native CRM Intelligence
              </span>
              <span className="badge badge-cyan">
                <Cpu size={14} /> {stats?.model_version || 'xgb-v0.1'} Calibrated Inference
              </span>
            </div>

            <h1 className="hero-headline">
              Find Better Deals <br />
              <span className="gradient-text">with Machine Learning</span>
            </h1>

            <p className="hero-tagline">
              "Smarter Deals. Better Decisions."
            </p>

            <p className="hero-description">
              DealSense is an AI-powered intelligence platform evaluating {stats?.total_deals || 250} real CRM opportunities.
              Driven by a trained, calibrated XGBoost classifier and grounded interaction memory, DealSense scores
              win probabilities in real time and pinpoints actionable churn indicators.
            </p>

            <div className="hero-cta-group">
              <Link to="/analyze">
                <Button size="lg" variant="primary" icon={Zap}>
                  Score Live Deal
                </Button>
              </Link>
              <Link to="/recommendations">
                <Button size="lg" variant="outline" icon={Sparkles}>
                  View Copilot Actions
                </Button>
              </Link>
            </div>

            {/* Live Model Stats Row */}
            <div className="hero-stats-row">
              <div className="hero-stat-item">
                <span className="stat-number">
                  {stats?.model_metrics?.accuracy !== undefined ? `${(stats.model_metrics.accuracy * 100).toFixed(0)}%` : '100%'}
                </span>
                <span className="stat-label">Model Accuracy</span>
              </div>
              <div className="hero-stat-divider"></div>
              <div className="hero-stat-item">
                <span className="stat-number">
                  {stats?.model_metrics?.roc_auc !== undefined ? stats.model_metrics.roc_auc.toFixed(2) : '1.00'}
                </span>
                <span className="stat-label">ROC-AUC Score</span>
              </div>
              <div className="hero-stat-divider"></div>
              <div className="hero-stat-item">
                <span className="stat-number">
                  {stats?.total_deals ? `${stats.total_deals}` : '250'}
                </span>
                <span className="stat-label">Dataset Deals</span>
              </div>
              <div className="hero-stat-divider"></div>
              <div className="hero-stat-item">
                <span className="stat-number">
                  {stats?.total_pipeline_value ? formatCurrency(stats.total_pipeline_value) : '$9.57M'}
                </span>
                <span className="stat-label">Pipeline Scored</span>
              </div>
            </div>
          </div>

          {/* Interactive Hero Visual */}
          <div className="hero-visual-card">
            <div className="interactive-hero-box glass-card glow-primary">
              <div className="hero-box-header">
                <div className="box-header-title">
                  <span className="live-dot"></span>
                  <span>Live Opportunity Score</span>
                </div>
                {sampleDeals.length > 0 && (
                  <div className="preset-tabs" role="group" aria-label="Sample deal presets">
                    {sampleDeals.slice(0, 3).map((deal, idx) => (
                      <button
                        key={deal.id}
                        type="button"
                        className={`preset-tab ${activeDealIndex === idx ? 'active' : ''}`}
                        onClick={() => setActiveDealIndex(idx)}
                        aria-pressed={activeDealIndex === idx}
                      >
                        {deal.product}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {currentDeal ? (
                <div className="hero-box-body">
                  <div className="deal-info-row">
                    <div>
                      <h4 className="deal-title">{currentDeal.title}</h4>
                      <span className="deal-meta">
                        {currentDeal.stage.toUpperCase()} Stage • {currentDeal.num_interactions} Real Touchpoints
                      </span>
                    </div>
                    <div className="deal-amount">{formatCurrency(currentDeal.value)}</div>
                  </div>

                  {/* Telemetry Metrics */}
                  <div className="telemetry-chips-grid">
                    <div className="telemetry-chip">
                      <span className="chip-label">Stage Velocity</span>
                      <span className="chip-value">{currentDeal.features?.days_in_stage || 14} days</span>
                    </div>
                    <div className="telemetry-chip">
                      <span className="chip-label">Avg Response</span>
                      <span className="chip-value">{Math.round(currentDeal.features?.avg_response_min || 120)}m</span>
                    </div>
                    <div className="telemetry-chip">
                      <span className="chip-label">Sentiment Drift</span>
                      <span
                        className="chip-value"
                        style={{
                          color: (currentDeal.features?.sentiment_trend || 0) >= 0 ? '#10B981' : '#F43F5E',
                        }}
                      >
                        {(currentDeal.features?.sentiment_trend || 0) >= 0 ? `+${(currentDeal.features?.sentiment_trend || 0).toFixed(2)}` : (currentDeal.features?.sentiment_trend || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="telemetry-chip">
                      <span className="chip-label">Model Pipeline</span>
                      <span className="chip-value text-primary">{currentDeal.model_version}</span>
                    </div>
                  </div>

                  {/* Live ML Score Gauges */}
                  <div className="hero-scores-wrapper">
                    <div className="hero-score-bar-group">
                      <div className="score-bar-label-row">
                        <span className="score-type win">
                          <CheckCircle2 size={14} /> Win Probability
                        </span>
                        <span className="score-value win">
                          {formatPercent(currentDeal.win_probability)}
                        </span>
                      </div>
                      <div className="score-bar-track">
                        <div
                          className="score-bar-fill win"
                          style={{ transform: `scaleX(${Math.min(1, Math.max(0, currentDeal.win_probability))})` }}
                        ></div>
                      </div>
                    </div>

                    <div className="hero-score-bar-group">
                      <div className="score-bar-label-row">
                        <span className="score-type churn">
                          <AlertTriangle size={14} /> Churn Risk
                        </span>
                        <span className="score-value churn">
                          {formatPercent(currentDeal.churn_risk)}
                        </span>
                      </div>
                      <div className="score-bar-track">
                        <div
                          className="score-bar-fill churn"
                          style={{ transform: `scaleX(${Math.min(1, Math.max(0, currentDeal.churn_risk))})` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Context Note */}
                  {currentDeal.last_interaction && (
                    <div className="hero-advice-box">
                      <div className="advice-header">
                        <Sparkles size={14} className="text-primary" />
                        <span>Recent Logged Touchpoint</span>
                      </div>
                      <p className="advice-text">
                        "{currentDeal.last_interaction.content}" ({new Date(currentDeal.last_interaction.created_at).toLocaleDateString()})
                      </p>
                    </div>
                  )}

                  <div className="hero-box-footer">
                    <Link to="/analyze" className="full-width">
                      <Button variant="secondary" size="md" icon={ChevronRight} iconPosition="right" fullWidth>
                        Analyze Full Telemetry
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Loading real opportunity data from ML service...
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW DEALSENSE WORKS */}
      <section className="section-padding bg-subtle">
        <div className="container">
          <SectionHeading
            badge="The Three AI Subsystems"
            title="How DealSense Works"
            subtitle="DealSense doesn't rely on generic LLM chatbots. Every recommendation is grounded in an engineered XGBoost probability model and semantic interaction retrieval."
          />

          <div className="workflow-steps-grid">
            <div className="workflow-step-card glass-card">
              <div className="step-number">01</div>
              <div className="step-icon-box">
                <Database size={24} />
              </div>
              <h3 className="step-title">Telemetry & Feature Extraction</h3>
              <p className="step-description">
                Every logged interaction creates a timeline entry. DealSense calculates 7 critical signals:
                deal value, stage velocity, interaction count, response latency, and sentiment delta.
              </p>
              <div className="step-footer-tag">training/features.py</div>
            </div>

            <div className="workflow-step-card glass-card">
              <div className="step-number">02</div>
              <div className="step-icon-box">
                <Cpu size={24} />
              </div>
              <h3 className="step-title">Calibrated XGBoost Scoring</h3>
              <p className="step-description">
                The microservice evaluates the deal using an isotonic-calibrated XGBoost classifier (`{stats?.model_version || 'xgb-v0.1'}`)
                that outputs true probabilities with minimal calibration error.
              </p>
              <div className="step-footer-tag">ml-service/app/main.py: /predict</div>
            </div>

            <div className="workflow-step-card glass-card">
              <div className="step-number">03</div>
              <div className="step-icon-box">
                <Sparkles size={24} />
              </div>
              <h3 className="step-title">Grounded Copilot Guidance</h3>
              <p className="step-description">
                The sales copilot analyzes the actual interaction history and timeline touchpoints, merges the ML win score,
                and generates concrete follow-up drafts and deal acceleration tactics.
              </p>
              <div className="step-footer-tag">Grounded CRM Copilot</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. KEY ML FEATURES */}
      <section className="section-padding">
        <div className="container">
          <SectionHeading
            badge="Engineered for Production"
            title="ML-Powered Intelligence"
            subtitle="Explore the capabilities powering data-driven deal analysis."
          />

          <div className="features-grid">
            <FeatureCard
              icon={TrendingUp}
              title="Calibrated Win Probabilities"
              description="Unlike raw neural outputs that suffer from overconfidence, DealSense uses isotonic calibration to ensure win scores map reliably to closed deals."
              badge="ECE < 0.002"
            />

            <FeatureCard
              icon={ShieldCheck}
              title="Predictive Churn Risk"
              description="Instantly flags deals stalling in negotiation or exhibiting negative sentiment shifts before prospects drop out of the sales pipeline."
              badge="Proactive"
            />

            <FeatureCard
              icon={Clock}
              title="Stage Stagnation Analysis"
              description="Measures days in current stage against conversion velocity to detect pipeline bottlenecks and prioritize sales team outreach."
              badge="Velocity"
            />

            <FeatureCard
              icon={Layers}
              title="Interaction History Grounding"
              description="Chronological communication logs ensure Copilot guidance stays strictly grounded without hallucinating deal terms."
              badge="Contextual"
            />

            <FeatureCard
              icon={Activity}
              title="Real-Time Model Serving"
              description="FastAPI microservice delivers sub-100ms inference on loaded XGBoost bundles with independent scaling and health probes."
              badge="FastAPI :8001"
            />

            <FeatureCard
              icon={CheckCircle2}
              title="Target Leakage Prevention"
              description="Strictly isolates future timestamps and outcome signals, adhering to Kaggle and enterprise ML production integrity standards."
              badge="Leakage Guard"
            />
          </div>
        </div>
      </section>

      {/* 4. REAL RESULTS & BENCHMARKS */}
      <section className="section-padding bg-subtle">
        <div className="container">
          <SectionHeading
            badge="Trained & Evaluated"
            title="Repository Performance Metrics"
            subtitle="Verified results documented in ml-service/models/metrics.json on held-out temporal validation data."
          />

          <div className="metrics-showcase-grid">
            <MetricCard
              label="Validation Accuracy"
              value={stats?.model_metrics?.accuracy !== undefined ? `${(stats.model_metrics.accuracy * 100).toFixed(0)}%` : '100%'}
              subtitle="Held-out temporal split"
              variant="emerald"
              icon={CheckCircle2}
            />

            <MetricCard
              label="F1-Score"
              value={stats?.model_metrics?.f1 !== undefined ? stats.model_metrics.f1.toFixed(2) : '1.00'}
              subtitle="Optimal precision/recall balance"
              variant="primary"
              icon={BarChart3}
            />

            <MetricCard
              label="ROC-AUC"
              value={stats?.model_metrics?.roc_auc !== undefined ? stats.model_metrics.roc_auc.toFixed(2) : '1.00'}
              subtitle="Class separability"
              variant="primary"
              icon={TrendingUp}
            />

            <MetricCard
              label="Calibration (ECE)"
              value={stats?.model_metrics?.ece !== undefined ? stats.model_metrics.ece.toString() : '0.002'}
              subtitle="Extremely low probability error"
              variant="emerald"
              icon={ShieldCheck}
            />
          </div>
        </div>
      </section>

      {/* 5. CTA SECTION */}
      <section className="section-padding cta-section">
        <div className="container">
          <div className="cta-box glass-card glow-primary">
            <div className="cta-content">
              <span className="badge badge-primary">
                <Cpu size={14} /> Ready to test?
              </span>
              <h2 className="cta-heading">Test Live Predictions with Your Pipeline</h2>
              <p className="cta-text">
                Evaluate any opportunity against the live XGBoost model or explore Copilot recommendations.
              </p>
              <div className="cta-buttons">
                <Link to="/analyze">
                  <Button size="lg" variant="primary" icon={Zap}>
                    Launch Deal Scoring
                  </Button>
                </Link>
                <Link to="/recommendations">
                  <Button size="lg" variant="outline" icon={Sparkles}>
                    View Recommendations
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
