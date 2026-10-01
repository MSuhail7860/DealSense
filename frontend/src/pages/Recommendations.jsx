import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Sparkles,
  Zap,
  CheckCircle2,
  Clock,
  Layers,
  Send,
  Filter,
  DollarSign,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import InputField from '../components/InputField';
import Button from '../components/Button';
import RecommendationCard from '../components/RecommendationCard';
import SkeletonCard from '../components/SkeletonCard';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { useCopilot } from '../hooks/useCopilot';
import { formatCurrency, formatPercent } from '../utils/formatters';
import './Recommendations.css';

const SAMPLE_DEALS = [
  {
    id: 'd-101-acme',
    name: 'Acme Corp — Global Enterprise Rollout',
    value: 125000,
    stage: 'proposal',
    win_probability: 0.85,
    churn_risk: 0.15,
  },
  {
    id: 'd-102-zenith',
    name: 'Zenith Logistics — Fleet Telemetry CRM',
    value: 64000,
    stage: 'negotiation',
    win_probability: 0.42,
    churn_risk: 0.58,
  },
  {
    id: 'd-103-pulse',
    name: 'Pulse Health — HIPAA Cloud Integration',
    value: 48000,
    stage: 'qualified',
    win_probability: 0.68,
    churn_risk: 0.32,
  },
];

const SUGGESTED_PROMPTS = [
  'Suggest next best action to accelerate closing',
  'Draft follow-up addressing budget hesitation and pricing objection',
  'Analyze churn risk factors and recommend objection handling',
  'Prepare negotiation stage checklist for commercial sign-off',
];

export default function Recommendations() {
  const location = useLocation();
  const passedDealResult = location.state?.dealResult || null;

  const [selectedDealId, setSelectedDealId] = useState(
    passedDealResult ? 'current-analyzed-deal' : SAMPLE_DEALS[0].id
  );

  const [customPrompt, setCustomPrompt] = useState(
    'Suggest next best action to accelerate closing'
  );

  const [filterTab, setFilterTab] = useState('all'); // 'all', 'pending', 'accepted'
  const [acceptingId, setAcceptingId] = useState(null);

  const {
    loading,
    error,
    suggestions,
    requestSuggestion,
    markAccepted,
    clearSuggestions,
  } = useCopilot();

  // Find active deal context
  let currentDealContext = null;
  if (selectedDealId === 'current-analyzed-deal' && passedDealResult) {
    currentDealContext = {
      id: 'current-analyzed-deal',
      name: 'Recently Analyzed Opportunity',
      value: passedDealResult.inputs?.deal_value || 50000,
      stage: passedDealResult.inputs?.stage || 'proposal',
      win_probability: passedDealResult.win_probability,
      churn_risk: passedDealResult.churn_risk,
    };
  } else {
    currentDealContext = SAMPLE_DEALS.find((d) => d.id === selectedDealId) || SAMPLE_DEALS[0];
  }

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!customPrompt.trim()) return;

    await requestSuggestion(
      currentDealContext.id,
      customPrompt,
      currentDealContext
    );
  };

  const handleAccept = async (dealId, suggestionId) => {
    setAcceptingId(suggestionId);
    try {
      await markAccepted(dealId, suggestionId);
    } finally {
      setAcceptingId(null);
    }
  };

  const filteredSuggestions = suggestions.filter((item) => {
    if (filterTab === 'accepted') return item.accepted;
    if (filterTab === 'pending') return !item.accepted;
    return true;
  });

  return (
    <div className="page-container recommendations-page">
      <div className="container">
        {/* Header */}
        <div className="rec-page-header">
          <div className="rec-title-group">
            <span className="badge badge-primary">
              <Sparkles size={14} /> RAG Sales Copilot
            </span>
            <h1 className="rec-main-heading">Deal Recommendations & Copilot Actions</h1>
            <p className="rec-main-subheading">
              Grounded recommendations generated from historical customer interaction memory
              (pgvector embeddings) synthesized with the latest XGBoost calibrated win score.
            </p>
          </div>
        </div>

        {/* Top Control Panel: Deal Selector & Prompt Input */}
        <div className="rec-control-panel glass-card">
          {/* Deal Context Picker */}
          <div className="rec-deal-picker-row">
            <span className="picker-label">Active Opportunity Context:</span>
            <div className="deal-pills-list">
              {passedDealResult && (
                <button
                  type="button"
                  className={`deal-pill ${selectedDealId === 'current-analyzed-deal' ? 'active' : ''}`}
                  onClick={() => setSelectedDealId('current-analyzed-deal')}
                >
                  <Sparkles size={13} />
                  <span>Recently Analyzed (${Number(passedDealResult.inputs?.deal_value || 0).toLocaleString()})</span>
                </button>
              )}
              {SAMPLE_DEALS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`deal-pill ${selectedDealId === d.id ? 'active' : ''}`}
                  onClick={() => setSelectedDealId(d.id)}
                >
                  <span>{d.name.split('—')[0].trim()}</span>
                  <span className="deal-pill-val">{formatCurrency(d.value)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Current Deal Snapshot Bar */}
          {currentDealContext && (
            <div className="current-deal-snapshot">
              <div className="snapshot-item">
                <span className="snapshot-label">Deal:</span>
                <span className="snapshot-val">{currentDealContext.name}</span>
              </div>
              <div className="snapshot-item">
                <span className="snapshot-label">Value:</span>
                <span className="snapshot-val">{formatCurrency(currentDealContext.value)}</span>
              </div>
              <div className="snapshot-item">
                <span className="snapshot-label">Stage:</span>
                <span className="snapshot-val capitalize">{currentDealContext.stage}</span>
              </div>
              <div className="snapshot-item">
                <span className="snapshot-label">ML Win Probability:</span>
                <span className="snapshot-val text-emerald">
                  {formatPercent(currentDealContext.win_probability)}
                </span>
              </div>
              <div className="snapshot-item">
                <span className="snapshot-label">Churn Risk:</span>
                <span className="snapshot-val text-rose">
                  {formatPercent(currentDealContext.churn_risk)}
                </span>
              </div>
            </div>
          )}

          {/* Prompt Form */}
          <form onSubmit={handleGenerate} className="rec-prompt-form">
            <div className="rec-prompt-input-wrapper">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Ask DealSense Copilot for next actions, negotiation tactics, or drafted notes..."
                className="rec-prompt-input"
                required
              />
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                icon={Send}
                disabled={!customPrompt.trim()}
              >
                {loading ? 'Synthesizing...' : 'Generate Guidance'}
              </Button>
            </div>

            {/* Quick Prompt Chips */}
            <div className="prompt-chips-wrapper">
              <span className="chips-label">Suggested Inquiries:</span>
              <div className="chips-list">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="prompt-chip-btn"
                    onClick={() => setCustomPrompt(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>

        {/* Results Header: Filters & Tabs */}
        <div className="rec-feed-header">
          <div className="rec-feed-tabs">
            <button
              type="button"
              className={`feed-tab ${filterTab === 'all' ? 'active' : ''}`}
              onClick={() => setFilterTab('all')}
            >
              All Suggestions ({suggestions.length})
            </button>
            <button
              type="button"
              className={`feed-tab ${filterTab === 'pending' ? 'active' : ''}`}
              onClick={() => setFilterTab('pending')}
            >
              Pending Action ({suggestions.filter((s) => !s.accepted).length})
            </button>
            <button
              type="button"
              className={`feed-tab ${filterTab === 'accepted' ? 'active' : ''}`}
              onClick={() => setFilterTab('accepted')}
            >
              Accepted ({suggestions.filter((s) => s.accepted).length})
            </button>
          </div>

          {suggestions.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={clearSuggestions}
            >
              Clear Feed
            </Button>
          )}
        </div>

        {/* Feed Body */}
        <div className="rec-feed-body">
          {loading && (
            <div className="rec-loading-list">
              <SkeletonCard lines={4} />
              <SkeletonCard lines={3} />
            </div>
          )}

          {!loading && error && (
            <ErrorMessage
              title="Copilot Generation Failed"
              message={error}
              onRetry={handleGenerate}
            />
          )}

          {!loading && !error && filteredSuggestions.length === 0 && (
            <EmptyState
              icon={Sparkles}
              title={
                filterTab === 'all'
                  ? 'No Recommendations Generated Yet'
                  : `No ${filterTab} recommendations found`
              }
              description="Select an opportunity context above, pick or type an inquiry prompt, and generate an AI Copilot recommendation grounded in CRM history."
              actionLabel="Generate First Recommendation"
              onAction={handleGenerate}
              actionIcon={Sparkles}
            />
          )}

          {!loading && !error && filteredSuggestions.length > 0 && (
            <div className="recommendations-list">
              {filteredSuggestions.map((suggestion) => (
                <RecommendationCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAccept={handleAccept}
                  isAccepting={acceptingId === suggestion.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
