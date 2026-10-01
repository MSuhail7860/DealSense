import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Sparkles,
  Send,
  Database
} from 'lucide-react';
import Button from '../components/Button';
import RecommendationCard from '../components/RecommendationCard';
import SkeletonCard from '../components/SkeletonCard';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { useCopilot } from '../hooks/useCopilot';
import { getRealDeals } from '../api/predictionApi';
import { formatCurrency, formatPercent } from '../utils/formatters';
import './Recommendations.css';

const SUGGESTED_PROMPTS = [
  'Suggest next best action to accelerate closing',
  'Draft follow-up addressing budget hesitation and pricing objection',
  'Analyze churn risk factors and recommend objection handling',
  'Prepare negotiation stage checklist for commercial sign-off',
];

export default function Recommendations() {
  const location = useLocation();
  const passedDealResult = location.state?.dealResult || null;

  const [realDeals, setRealDeals] = useState([]);
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [selectedDealId, setSelectedDealId] = useState(
    passedDealResult ? 'current-analyzed-deal' : ''
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

  // Load real CRM deals on mount
  useEffect(() => {
    let mounted = true;
    async function loadDeals() {
      try {
        setLoadingDeals(true);
        const data = await getRealDeals(25);
        if (mounted && Array.isArray(data) && data.length > 0) {
          setRealDeals(data);
          if (!passedDealResult) {
            setSelectedDealId(data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load deals for recommendations:', err);
      } finally {
        if (mounted) setLoadingDeals(false);
      }
    }
    loadDeals();
    return () => { mounted = false; };
  }, [passedDealResult]);

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
      num_interactions: passedDealResult.inputs?.num_interactions || 1,
    };
  } else if (realDeals.length > 0) {
    const found = realDeals.find((d) => d.id === selectedDealId) || realDeals[0];
    currentDealContext = {
      id: found.id,
      name: found.title,
      value: found.value,
      stage: found.stage,
      win_probability: found.win_probability,
      churn_risk: found.churn_risk,
      num_interactions: found.num_interactions,
      last_interaction: found.last_interaction,
    };
  }

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!customPrompt.trim() || !currentDealContext) return;

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
              <Sparkles size={14} /> Grounded CRM Copilot
            </span>
            <h1 className="rec-main-heading">Deal Recommendations & Copilot Actions</h1>
            <p className="rec-main-subheading">
              Action plans and next steps grounded directly in each opportunity's actual interaction history,
              analyzing prospect objections, timeline notes, and trained XGBoost win/churn probability.
            </p>
          </div>
        </div>

        {/* Top Control Panel: Real Deal Selector & Prompt Input */}
        <div className="rec-control-panel glass-card">
          {/* Deal Context Picker */}
          <div className="rec-deal-picker-row">
            <span className="picker-label">
              <Database size={14} className="text-primary" /> Active CRM Opportunity:
            </span>
            {loadingDeals ? (
              <span className="text-secondary text-sm">Fetching real opportunities from dataset...</span>
            ) : (
              <div className="deal-pills-list" role="group" aria-label="Available CRM Opportunities">
                {passedDealResult && (
                  <button
                    type="button"
                    className={`deal-pill ${selectedDealId === 'current-analyzed-deal' ? 'active' : ''}`}
                    onClick={() => setSelectedDealId('current-analyzed-deal')}
                    aria-pressed={selectedDealId === 'current-analyzed-deal'}
                  >
                    <Sparkles size={13} />
                    <span>Analyzed (${Number(passedDealResult.inputs?.deal_value || 0).toLocaleString()})</span>
                  </button>
                )}
                {realDeals.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={`deal-pill ${selectedDealId === d.id ? 'active' : ''}`}
                    onClick={() => setSelectedDealId(d.id)}
                    aria-pressed={selectedDealId === d.id}
                    title={`UUID: ${d.id} • ${d.num_interactions} Interactions`}
                  >
                    <span>{d.title}</span>
                    <span className="deal-pill-val">{formatCurrency(d.value)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Current Deal Snapshot Bar */}
          {currentDealContext && (
            <div className="current-deal-snapshot">
              <div className="snapshot-item">
                <span className="snapshot-label">Deal / Contact:</span>
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
                <span className="snapshot-label">XGBoost Win Prob:</span>
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
              <div className="snapshot-item">
                <span className="snapshot-label">Interactions:</span>
                <span className="snapshot-val">{currentDealContext.num_interactions} touchpoints</span>
              </div>
            </div>
          )}

          {/* Prompt Form */}
          <form onSubmit={handleGenerate} className="rec-prompt-form">
            <div className="rec-prompt-input-wrapper">
              <input
                id="copilot-prompt-input"
                aria-label="Ask DealSense Copilot for actions, negotiation tactics, or drafted notes"
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
                disabled={!customPrompt.trim() || !currentDealContext}
              >
                {loading ? 'Synthesizing Action Plan...' : 'Generate Guidance'}
              </Button>
            </div>

            {/* Quick Prompt Chips */}
            <div className="prompt-chips-wrapper">
              <span className="chips-label">Inquiry Intent:</span>
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
          <div className="rec-feed-tabs" role="tablist" aria-label="Filter recommendations">
            <button
              type="button"
              role="tab"
              aria-selected={filterTab === 'all'}
              className={`feed-tab ${filterTab === 'all' ? 'active' : ''}`}
              onClick={() => setFilterTab('all')}
            >
              All Suggestions ({suggestions.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterTab === 'pending'}
              className={`feed-tab ${filterTab === 'pending' ? 'active' : ''}`}
              onClick={() => setFilterTab('pending')}
            >
              Pending Action ({suggestions.filter((s) => !s.accepted).length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filterTab === 'accepted'}
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
              description="Select a live CRM opportunity above, pick or customize an inquiry prompt, and generate guidance grounded in real prospect touchpoints."
              actionLabel="Generate Guidance for Active Deal"
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
