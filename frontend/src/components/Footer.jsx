import React from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuit, Cpu, Database, ShieldCheck, Heart } from 'lucide-react';
import './Footer.css';

function GithubIcon({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-container">
        <div className="footer-top-grid">
          {/* Brand Info */}
          <div className="footer-brand-col">
            <Link to="/" className="footer-brand">
              <div className="brand-logo-mark small">
                <BrainCircuit size={18} />
              </div>
              <span className="brand-name">DealSense</span>
            </Link>
            <p className="footer-tagline">Smarter Deals. Better Decisions.</p>
            <p className="footer-description">
              AI-native deal intelligence and CRM platform featuring calibrated XGBoost win-probability scoring,
              pgvector RAG interaction grounding, and real-time deal copilot assistance.
            </p>
            <div className="footer-social-links">
              <a
                href="https://github.com/Saurabhanand12/DealSense"
                target="_blank"
                rel="noreferrer"
                className="footer-icon-link"
                title="GitHub Repository"
              >
                <GithubIcon size={18} />
                <span>GitHub Repository</span>
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">Product</h4>
            <ul className="footer-links-list">
              <li><Link to="/analyze">Deal Analysis & ML</Link></li>
              <li><Link to="/recommendations">AI Copilot Recommendations</Link></li>
              <li><Link to="/results">Diagnostics & Dashboard</Link></li>
              <li><Link to="/how-it-works">How It Works</Link></li>
            </ul>
          </div>

          {/* Machine Learning Track */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">ML Architecture</h4>
            <ul className="footer-links-list">
              <li><span className="footer-badge-link"><Cpu size={13} /> XGBoost Classifier</span></li>
              <li><span className="footer-badge-link"><ShieldCheck size={13} /> Isotonic Calibration (ECE 0.002)</span></li>
              <li><span className="footer-badge-link"><Database size={13} /> pgvector RAG Embedding</span></li>
              <li><Link to="/about">Model Metrics & Specs</Link></li>
            </ul>
          </div>

          {/* Stack & Integration */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">Tech Stack</h4>
            <div className="footer-tech-tags">
              <span className="tech-tag">React + Vite</span>
              <span className="tech-tag">FastAPI (uv)</span>
              <span className="tech-tag">XGBoost</span>
              <span className="tech-tag">PostgreSQL</span>
              <span className="tech-tag">pgvector</span>
              <span className="tech-tag">Redis Pub/Sub</span>
              <span className="tech-tag">Cohere Command</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <p className="copyright-text">
            © {new Date().getFullYear()} DealSense. Built for developer & machine learning portfolio demonstration.
          </p>
          <div className="footer-status-pill">
            <span className="footer-status-dot"></span>
            <span>xgb-v0.1 Model Frozen Contract</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
