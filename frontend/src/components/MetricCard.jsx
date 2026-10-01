import React from 'react';
import './MetricCard.css';

export default function MetricCard({
  label,
  value,
  subtitle = '',
  icon: Icon = null,
  trend = null,
  trendLabel = '',
  variant = 'default',
  badge = null,
  className = '',
}) {
  return (
    <div className={`metric-card glass-card variant-${variant} ${className}`}>
      <div className="metric-header">
        <span className="metric-label">{label}</span>
        {Icon && (
          <span className="metric-icon-box">
            <Icon size={18} />
          </span>
        )}
      </div>

      <div className="metric-body">
        <div className="metric-value">{value}</div>
        {badge && <div className="metric-badge-container">{badge}</div>}
      </div>

      {(subtitle || trend !== null) && (
        <div className="metric-footer">
          {trend !== null && (
            <span
              className={`metric-trend ${trend >= 0 ? 'trend-positive' : 'trend-negative'}`}
            >
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
          {trendLabel && <span className="trend-label">{trendLabel}</span>}
          {subtitle && <span className="metric-subtitle">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
