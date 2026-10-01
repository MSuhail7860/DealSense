import React, { useState } from 'react';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import Button from './Button';
import './FeedbackStates.css';

export default function ErrorMessage({
  title = 'An error occurred',
  message,
  onRetry = null,
  details = null,
  className = '',
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={`error-alert glass-card ${className}`} role="alert">
      <div className="error-alert-header">
        <div className="error-icon-wrapper">
          <AlertCircle size={22} className="error-icon-svg" />
        </div>
        <div className="error-text-content">
          <h4 className="error-title">{title}</h4>
          <p className="error-description">{message}</p>
        </div>
      </div>

      {(onRetry || details) && (
        <div className="error-alert-actions">
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              icon={RefreshCw}
              onClick={onRetry}
            >
              Try Again
            </Button>
          )}

          {details && (
            <button
              type="button"
              className="toggle-details-btn"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? (
                <>Hide technical info <ChevronUp size={14} /></>
              ) : (
                <>Show technical info <ChevronDown size={14} /></>
              )}
            </button>
          )}
        </div>
      )}

      {showDetails && details && (
        <div className="error-technical-box">
          <pre>{typeof details === 'object' ? JSON.stringify(details, null, 2) : String(details)}</pre>
        </div>
      )}
    </div>
  );
}
