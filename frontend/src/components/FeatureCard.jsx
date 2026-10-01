import React from 'react';
import './FeatureCard.css';

export default function FeatureCard({
  icon: Icon,
  title,
  description,
  badge = null,
  gradient = 'primary',
  className = '',
}) {
  return (
    <div className={`feature-card glass-card grad-${gradient} ${className}`}>
      <div className="feature-card-header">
        <div className="feature-icon-wrapper">
          <Icon size={22} />
        </div>
        {badge && <span className="feature-badge">{badge}</span>}
      </div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-description">{description}</p>
    </div>
  );
}
