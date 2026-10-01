import React from 'react';
import Button from './Button';
import './FeedbackStates.css';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel = null,
  onAction = null,
  actionIcon = null,
  children = null,
  className = '',
}) {
  return (
    <div className={`empty-state glass-card ${className}`}>
      {Icon && (
        <div className="empty-state-icon-box">
          <Icon size={36} />
        </div>
      )}
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}

      {children}

      {actionLabel && onAction && (
        <div className="empty-state-action">
          <Button
            variant="primary"
            icon={actionIcon}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
