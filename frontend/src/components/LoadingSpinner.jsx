import React from 'react';
import './FeedbackStates.css';

export default function LoadingSpinner({
  size = 'md',
  message = 'Processing...',
  subtext = '',
  className = '',
}) {
  return (
    <div className={`spinner-container spinner-${size} ${className}`} role="status" aria-live="polite">
      <div className="spinner-orbit">
        <div className="spinner-core"></div>
        <div className="spinner-glow"></div>
      </div>
      {message && <div className="spinner-message">{message}</div>}
      {subtext && <div className="spinner-subtext">{subtext}</div>}
    </div>
  );
}
