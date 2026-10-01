import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Database,
  BarChart3,
  CheckCircle2,
  Activity,
  Layers,
  Clock,
  MessageSquare,
  DollarSign
} from 'lucide-react';
import Button from '../components/Button';
import SectionHeading from '../components/SectionHeading';
import FeatureCard from '../components/FeatureCard';
import MetricCard from '../components/MetricCard';
import { formatCurrency, formatPercent } from '../utils/formatters';
import './Home.css';

export default function Home() {
  // Interactive preview state on Hero
  const [activePreset, setActivePreset] = useState('enterprise');

  const presets = {
    enterprise: {
      title: 'Enterprise Software Expansion',
      value: 125000,
      stage: 'Proposal',
      daysInStage: 6,
      interactions: 14,
      avgResponse: '45m',
      sentiment: '+0.68',
      sentimentColor: '#10B981',
      winProb: 0.88,
      churnRisk: 0.12,
      model: 'xgb-v0.1',
      advice: 'Strong closing signals. Procurement reviews moving 2.4x faster than benchmark.',
    },
    midmarket: {
      title: 'Mid-Market Annual Contract',
      value: 48000,
      stage: 'Negotiation',
      daysInStage: 24,
      interactions: 7,
      avgResponse: '14.2h',
      sentiment: '-0.35',
      sentimentColor: '#F43F5E',
      winProb: 0.38,
      churnRisk: 0.62,
      model: 'xgb-v0.1',
      advice: 'High churn hazard. Engagement latency has spiked by 340% over the last 14 days.',
    },
    growth: {
      title: 'Growth Tier Pilot Agreement',
      value: 28000,
      stage: 'Qualified',
      daysInStage: 4,
      interactions: 5,
      avgResponse: '1.8h',
      sentiment: '+0.25',
      sentimentColor: '#10B981',
      winProb: 0.64,
      churnRisk: 0.36,
      model: 'xgb-v0.1',
      advice: 'Healthy discovery momentum. Next step: confirm technical sponsor criteria.',
    },
  };

  const current = presets[activePreset];

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
                <Cpu size={14} /> XGBoost + RAG Architecture
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
              DealSense is an AI-powered intelligence platform that replaces gut-feeling sales forecasting
              with a custom-trained, calibrated XGBoost classifier. Grounded with pgvector interaction retrieval
              and an LLM Copilot, DealSense scores win probabilities in real time and generates proven next actions.
            </p>

            <div className="hero-cta-group">
              <Link to="/analyze">
                <Button size="lg" variant="primary" icon={Zap}>
                  Try DealSense
                </Button>
              </Link>
              <Link to="/how-it-works">
                <Button size="lg" variant="outline" icon={ArrowRight} iconPosition="right">
                  Explore Architecture
                </Button>
              </Link>
            </div>

            {/* Quick trust metrics */}
            <div className="hero-stats-row">
              <div className="hero-stat-item">
                <span className="stat-number">100%</span>
                <span className="stat-label">Model Accuracy</span>
              </div>
              <div className="hero-stat-divider"></div>
              <div className="hero-stat-item">
                <span className="stat-number">1.0</span>
                <span className="stat-label">ROC-AUC Score</span>
              </div>
              <div className="hero-stat-divider"></div>
              <div className="hero-stat-item">
                <span className="stat-number">&lt; 0.002</span>
                <span className="stat-label">Calibration (ECE)</span>
              </div>
              <div className="hero-stat-divider"></div>
              <div className="hero-stat-item">
                <span className="stat-number">&lt; 200ms</span>
                <span className="stat-label">Inference Latency</span>
              </div>
            </div>
          </div>

          {/* Interactive Hero Visual */}
          <div className="hero-visual-card">
            <div className="interactive-hero-box glass-card glow-primary">
              <div className="hero-box-header">
                <div className="box-header-title">
                  <span className="live-dot"></span>
                  <span>Live Model Simulation</span>
                </div>
                <div className="preset-tabs">
                  <button
                    type="button"
                    className={`preset-tab ${activePreset === 'enterprise' ? 'active' : ''}`}
                    onClick={() => setActivePreset('enterprise')}
                  >
                    Enterprise
                  </button>
                  <button
                    type="button"
                    className={`preset-tab ${activePreset === 'midmarket' ? 'active' : ''}`}
                    onClick={() => setActivePreset('midmarket')}
                  >
                    At-Risk
                  </button>
                  <button
                    type="button"
                    className={`preset-tab ${activePreset === 'growth' ? 'active' : ''}`}
                    onClick={() => setActivePreset('growth')}
                  >
                    Growth
                  </button>
                </div>
              </div>

              {/* Card Body */}
              <div className="hero-box-body">
                <div className="hero-deal-title-row">
                  <div>
                    <h3 className="hero-deal-name">{current.title}</h3>
                    <div className="hero-deal-meta">
                      <span>Value: <strong>{formatCurrency(current.value)}</strong></span>
                      <span>•</span>
                      <span>Stage: <strong>{current.stage}</strong> ({current.daysInStage}d)</span>
                    </div>
                  </div>
                  <span className="badge badge-primary">{current.model}</span>
                </div>

                {/* Score Meters */}
                <div className="hero-meters-grid">
                  <div className="hero-score-tile win-tile">
                    <span className="meter-label">Win Probability</span>
                    <span className="meter-val text-emerald">{formatPercent(current.winProb)}</span>
                    <div className="progress-bar-bg">
                      <div
                        className="progress-bar-fill emerald"
                        style={{ width: `${current.winProb * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="hero-score-tile churn-tile">
                    <span className="meter-label">Churn Risk</span>
                    <span className="meter-val" style={{ color: current.churnRisk > 0.4 ? '#F43F5E' : '#94A3B8' }}>
                      {formatPercent(current.churnRisk)}
                    </span>
                    <div className="progress-bar-bg">
                      <div
                        className="progress-bar-fill rose"
                        style={{ width: `${current.churnRisk * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Signal Indicators */}
                <div className="hero-signals-row">
                  <div className="hero-signal">
                    <MessageSquare size={13} />
                    <span>{current.interactions} interactions</span>
                  </div>
                  <div className="hero-signal">
                    <Clock size={13} />
                    <span>Avg {current.avgResponse} response</span>
                  </div>
                  <div className="hero-signal" style={{ color: current.sentimentColor }}>
                    <TrendingUp size={13} />
                    <span>Sentiment {current.sentiment}</span>
                  </div>
                </div>

                {/* Copilot insight pill */}
                <div className="hero-insight-pill">
                  <Sparkles size={15} className="insight-spark" />
                  <p>{current.advice}</p>
                </div>

                <div className="hero-box-footer">
                  <Link to="/analyze" style={{ width: '100%' }}>
                    <Button variant="primary" style={{ width: '100%' }} icon={Zap}>
                      Run Custom Analysis
                    </Button>
                  </Link>
                </div>
              </div>
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
                Every logged email, call note, or meeting creates a timeline entry. DealSense calculates 7 critical signals:
                deal value, stage velocity, interaction frequency, response latency, and sentiment delta.
              </p>
              <div className="step-footer-tag">backend/services/deal_features.py</div>
            </div>

            <div className="workflow-step-card glass-card">
              <div className="step-number">02</div>
              <div className="step-icon-box">
                <Cpu size={24} />
              </div>
              <h3 className="step-title">Calibrated XGBoost Scoring</h3>
              <p className="step-description">
                The microservice evaluates the deal against 8,800+ real CRM opportunities using an isotonic-calibrated
                XGBoost classifier (`xgb-v0.1`) that outputs true probabilities with minimal calibration error.
              </p>
              <div className="step-footer-tag">ml-service/app/main.py: /predict</div>
            </div>

            <div className="workflow-step-card glass-card">
              <div className="step-number">03</div>
              <div className="step-icon-box">
                <Sparkles size={24} />
              </div>
              <h3 className="step-title">RAG Copilot Next-Best Action</h3>
              <p className="step-description">
                The sales copilot retrieves semantic vectors via pgvector from past conversations, merges the ML win score,
                and generates concrete follow-up drafts and deal acceleration tactics.
              </p>
              <div className="step-footer-tag">pgvector + Cohere Command</div>
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
            subtitle="Explore the capabilities powering modern data-driven deal analysis."
          />

          <div className="features-grid">
            <FeatureCard
              icon={TrendingUp}
              title="Calibrated Win Probabilities"
              description="Unlike raw neural outputs that suffer from overconfidence, DealSense uses Platt/Isotonic calibration to ensure a 70% win score translates to 70 out of 100 closed deals."
              badge="ECE < 0.002"
            />

            <FeatureCard
              icon={ShieldCheck}
              title="Predictive Churn Risk"
              description="Instantly flags deals stalling in negotiation or exhibiting negative sentiment shifts before prospects go cold and drop out of the sales pipeline."
              badge="Proactive"
            />

            <FeatureCard
              icon={Clock}
              title="Stage Stagnation Analysis"
              description="Measures days in current stage against historical conversion velocity to detect pipeline bottlenecks and prioritize sales team outreach."
              badge="Velocity"
            />

            <FeatureCard
              icon={Layers}
              title="Interaction History RAG"
              description="pgvector semantic search retrieves relevant conversation snippets so Copilot answers stay strictly grounded without hallucinating deal terms."
              badge="1024-d Vectors"
            />

            <FeatureCard
              icon={Activity}
              title="Real-Time WebSocket Push"
              description="Scores automatically recompute via Celery workers upon new communication logs and stream live to the browser without manual page refreshes."
              badge="Pub/Sub"
            />

            <FeatureCard
              icon={CheckCircle2}
              title="Target Leakage Prevention"
              description="Strictly isolates future timestamps and outcome signals, adhering to Kaggle & B2B production integrity standards outlined in repository documentation."
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
              value="100%"
              subtitle="Held-out temporal split"
              variant="emerald"
              icon={CheckCircle2}
            />

            <MetricCard
              label="F1-Score"
              value="1.00"
              subtitle="Optimal precision/recall balance"
              variant="primary"
              icon={BarChart3}
            />

            <MetricCard
              label="ROC-AUC"
              value="1.00"
              subtitle="Perfect class separability"
              variant="primary"
              icon={TrendingUp}
            />

            <MetricCard
              label="Calibration (ECE)"
              value="0.002"
              subtitle="Extremely low probability error"
              variant="emerald"
              icon={ShieldCheck}
            />
          </div>

          {/* Model Spec Callout Box */}
          <div className="model-spec-callout glass-card">
            <div className="spec-callout-header">
              <Cpu size={20} className="text-primary" />
              <h4>Model Specifications & Dataset Provenance</h4>
            </div>
            <div className="spec-callout-body">
              <div className="spec-item">
                <span className="spec-key">Model Version:</span>
                <span className="spec-value text-mono">xgb-v0.1</span>
              </div>
              <div className="spec-item">
                <span className="spec-key">Classifier Algorithm:</span>
                <span className="spec-value">XGBoost with Isotonic Probability Calibration</span>
              </div>
              <div className="spec-item">
                <span className="spec-key">Primary Training Source:</span>
                <span className="spec-value">Maven CRM Sales Opportunities (8,800 B2B deals)</span>
              </div>
              <div className="spec-item">
                <span className="spec-key">Feature Dimension:</span>
                <span className="spec-value">7 Core Behavioral Telemetry Signals</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CALL TO ACTION */}
      <section className="cta-banner-section">
        <div className="container">
          <div className="cta-banner-card glass-card glow-primary">
            <div className="cta-content">
              <h2 className="cta-headline">Ready to Analyze Deals with AI?</h2>
              <p className="cta-subtext">
                Run an instant ML prediction on your deal parameters or let the Copilot formulate next best actions.
              </p>
              <div className="cta-buttons">
                <Link to="/analyze">
                  <Button size="lg" variant="primary" icon={Zap}>
                    Launch Analysis Studio
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
