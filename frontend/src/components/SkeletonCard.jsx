import React from 'react';
import './FeedbackStates.css';

export default function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div className={`skeleton-card ${className}`} aria-hidden="true">
      <div className="skeleton-header">
        <div className="skeleton-avatar shimmer"></div>
        <div className="skeleton-titles">
          <div className="skeleton-line shimmer title-line"></div>
          <div className="skeleton-line shimmer subtitle-line"></div>
        </div>
      </div>
      <div className="skeleton-body">
        {Array.from({ length: lines }).map((_, idx) => (
          <div
            key={idx}
            className="skeleton-line shimmer"
            style={{ width: `${85 - idx * 15}%` }}
          ></div>
        ))}
      </div>
      <div className="skeleton-footer">
        <div className="skeleton-button shimmer"></div>
      </div>
    </div>
  );
}
