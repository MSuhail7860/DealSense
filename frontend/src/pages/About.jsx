import React from 'react';
import {
  Cpu,
  Database,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Code2,
  Terminal,
  BarChart3
} from 'lucide-react';
import Button from '../components/Button';
import './About.css';

function GithubIcon({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export default function About() {
  return (
    <div className="page-container about-page">
      <div className="container container-narrow">
        {/* Header */}
        <div className="about-header">
          <span className="badge badge-primary">Developer & Architecture Portfolio</span>
          <h1 className="about-title">About DealSense</h1>
          <p className="about-lead">
            An AI-native CRM and deal intelligence platform designed and implemented to demonstrate
            end-to-end Machine Learning operations, Calibrated Binary Classification, and RAG Copilot integration.
          </p>

          <div className="about-links-bar">
            <a
              href="https://github.com/Saurabhanand12/DealSense"
              target="_blank"
              rel="noreferrer"
              className="about-gh-btn"
            >
              <GithubIcon size={18} />
              <span>GitHub: Saurabhanand12/DealSense</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Project Background */}
        <div className="about-card glass-card">
          <h2 className="about-card-title">1. Why DealSense Exists</h2>
          <p>
            Standard enterprise CRM applications treat AI as a disconnected chatbot widget. Sales representatives
            manually guess deal close dates, and pipeline forecasts reflect wishful thinking rather than empirical data.
          </p>
          <p>
            DealSense was architected around three non-overlapping, purpose-built AI subsystems:
          </p>
          <div className="about-subsystems-grid">
            <div className="subsystem-box">
              <div className="subsystem-icon"><Cpu size={20} /></div>
              <h4>Custom ML Classifier</h4>
              <p>Predicts calibrated win probabilities and churn risk in &lt;200ms without hallucination.</p>
            </div>

            <div className="subsystem-box">
              <div className="subsystem-icon"><Database size={20} /></div>
              <h4>pgvector Semantic Store</h4>
              <p>Indexes customer timeline interactions (emails, call notes) into 1024-d embeddings.</p>
            </div>

            <div className="subsystem-box">
              <div className="subsystem-icon"><ShieldCheck size={20} /></div>
              <h4>Grounded LLM Copilot</h4>
              <p>Synthesizes retrieved interaction snippets with ML win scores to suggest concrete actions.</p>
            </div>
          </div>
        </div>

        {/* Interview Talking Points */}
        <div className="about-card glass-card">
          <h2 className="about-card-title">2. Key Engineering & MLOps Decisions</h2>
          
          <div className="qa-block">
            <h4 className="qa-question">Why RAG instead of fine-tuning an LLM on CRM data?</h4>
            <blockquote className="qa-answer">
              "Fine-tuning per customer is impractical in B2B enterprise software—customer data changes daily,
              contains strict privacy constraints, and fine-tuning cannot provide real-time updates. Retrieval (RAG)
              allows a single foundational model to stay grounded in fresh, customer-scoped interaction history
              without retraining."
            </blockquote>
          </div>

          <div className="qa-block">
            <h4 className="qa-question">Why deploy a separate ML microservice instead of running inference in the backend?</h4>
            <blockquote className="qa-answer">
              "Decoupling the ML inference service (port 8001) from the transactional API (port 8000) mirrors
              production MLOps patterns. It isolates heavy scientific dependencies (XGBoost, scikit-learn, joblib),
              enables independent scaling and zero-downtime model redeployment, and preserves FastAPI backend responsiveness."
            </blockquote>
          </div>

          <div className="qa-block">
            <h4 className="qa-question">Why is probability calibration necessary for XGBoost?</h4>
            <blockquote className="qa-answer">
              "Decision trees and gradient boosting algorithms optimize ranking (ROC-AUC) but produce distorted,
              uncalibrated raw sigmoid outputs. Using Platt/Isotonic calibration ensures that a predicted 75% win score
              statistically corresponds to an actual 75% close rate across historical cohorts."
            </blockquote>
          </div>
        </div>

        {/* Evaluation Metrics */}
        <div className="about-card glass-card">
          <h2 className="about-card-title">3. Model Validation & Benchmark Metrics</h2>
          <p>
            Metrics recorded in <code className="inline-code">ml-service/models/metrics.json</code> on held-out temporal 70/30 split:
          </p>

          <div className="metrics-specs-table-wrapper">
            <table className="specs-table">
              <tbody>
                <tr>
                  <td><strong>Model Version:</strong></td>
                  <td><code>xgb-v0.1</code></td>
                </tr>
                <tr>
                  <td><strong>Algorithm:</strong></td>
                  <td>XGBoost Classifier + CalibratedClassifierCV (Isotonic)</td>
                </tr>
                <tr>
                  <td><strong>Training Dataset:</strong></td>
                  <td>Maven CRM Sales Opportunities (8,800 deals) + Synthetic Interaction Logs</td>
                </tr>
                <tr>
                  <td><strong>Validation Accuracy:</strong></td>
                  <td className="text-emerald"><strong>100% (1.00)</strong></td>
                </tr>
                <tr>
                  <td><strong>Precision / Recall / F1:</strong></td>
                  <td className="text-emerald"><strong>1.00 / 1.00 / 1.00</strong></td>
                </tr>
                <tr>
                  <td><strong>ROC-AUC:</strong></td>
                  <td className="text-emerald"><strong>1.00</strong></td>
                </tr>
                <tr>
                  <td><strong>Expected Calibration Error (ECE):</strong></td>
                  <td className="text-emerald"><strong>0.002</strong></td>
                </tr>
                <tr>
                  <td><strong>Brier Score Loss:</strong></td>
                  <td className="text-emerald"><strong>0.0001</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Monorepo Layout */}
        <div className="about-card glass-card">
          <h2 className="about-card-title">4. Monorepo Structure</h2>
          <div className="monorepo-tree">
            <pre>{`DealSense/
├── Backend/                 # FastAPI REST API (managed with uv)
│   ├── src/backend/
│   │   ├── api/v1/         # auth, deals, contacts, copilot, interactions, websocket
│   │   ├── models/         # SQLAlchemy 2.0 ORM schemas
│   │   ├── schemas/        # Pydantic v2 validation contracts
│   │   ├── services/       # deal_features.py, copilot_service.py, ml_client.py
│   │   └── tasks.py        # Celery asynchronous score recompute worker
│   └── pyproject.toml
│
├── ml-service/              # Separate FastAPI inference microservice
│   ├── app/                # GET /health, POST /predict (frozen schema)
│   ├── training/           # train.py, features.py, evaluate.py
│   ├── models/             # xgb-v0.1.pkl, metrics.json, plots
│   └── data/               # sales_pipeline.csv (8,800 deals), synthetic.json
│
└── frontend/                # React + Vite Client (JavaScript)
    ├── src/
    │   ├── api/            # centralized API client, predictionApi, recommendationApi
    │   ├── components/     # PredictionCard, RecommendationCard, MetricCard, Form controls
    │   ├── pages/          # Home, Analyze, Recommendations, Results, HowItWorks, About
    │   ├── hooks/          # usePrediction, useCopilot, useHealth
    │   └── utils/          # validation.js, formatters.js
    └── vite.config.js`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
