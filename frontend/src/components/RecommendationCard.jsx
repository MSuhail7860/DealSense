import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  Clock,
  Layers,
  FileText,
  Calendar,
  ExternalLink
} from 'lucide-react';
import Button from './Button';
import './RecommendationCard.css';

export default function RecommendationCard({
  suggestion,
  onAccept = null,
  isAccepting = false,
  className = '',
}) {
  const [copied, setCopied] = useState(false);

  if (!suggestion) return null;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(suggestion.suggestion);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const contextCount = suggestion.retrieved_context_ids?.length || 0;
  const createdAtFormatted = suggestion.created_at
    ? new Date(suggestion.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Just now';

  return (
    <div className={`recommendation-card glass-card ${suggestion.accepted ? 'is-accepted' : ''} ${className}`}>
      {/* Header */}
      <div className="rec-card-header">
        <div className="rec-header-left">
          <span className="rec-icon-badge">
            <Sparkles size={16} />
          </span>
          <div>
            <h4 className="rec-prompt-title">{suggestion.prompt || 'Next Best Action Recommendation'}</h4>
            <div className="rec-meta-row">
              <span className="rec-meta-item">
                <Clock size={12} /> {createdAtFormatted}
              </span>
              {suggestion.deal_id && (
                <span className="rec-meta-item text-mono">
                  Deal: {String(suggestion.deal_id).substring(0, 8)}...
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="rec-header-right">
          {suggestion.accepted ? (
            <span className="badge badge-success">
              <CheckCircle2 size={13} />
              Applied & Accepted
            </span>
          ) : (
            <span className="badge badge-primary">AI Action Item</span>
          )}
        </div>
      </div>

      {/* Suggestion Body */}
      <div className="rec-card-body">
        <div className="rec-content-text">
          {suggestion.suggestion.split('\n\n').map((paragraph, idx) => {
            if (paragraph.toLowerCase().includes('draft follow-up note:') || paragraph.toLowerCase().includes('draft:')) {
              return (
                <div key={idx} className="rec-draft-container">
                  <div className="rec-draft-header">
                    <FileText size={14} />
                    <span>Drafted Communication Note</span>
                  </div>
                  <blockquote className="rec-draft-quote">{paragraph.replace(/^Draft Follow-up Note:\s*/i, '')}</blockquote>
                </div>
              );
            }
            return <p key={idx} className="rec-paragraph">{paragraph}</p>;
          })}
        </div>
      </div>

      {/* Footer Info: RAG Context & Actions */}
      <div className="rec-card-footer">
        <div className="rec-grounding-info">
          <Layers size={14} className="grounding-icon" />
          <span className="grounding-text">
            {contextCount > 0
              ? `Grounded in ${contextCount} retrieved past interaction${contextCount > 1 ? 's' : ''} (pgvector)`
              : 'Grounded in real-time deal telemetry & ML score'}
          </span>
        </div>

        <div className="rec-footer-actions">
          <button
            type="button"
            className="rec-action-icon-btn"
            onClick={handleCopy}
            title="Copy suggestion to clipboard"
          >
            {copied ? <Check size={16} className="text-emerald" /> : <Copy size={16} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {!suggestion.accepted && onAccept && (
            <Button
              size="sm"
              variant="success"
              icon={CheckCircle2}
              loading={isAccepting}
              onClick={() => onAccept(suggestion.deal_id, suggestion.id)}
            >
              Accept Action
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
