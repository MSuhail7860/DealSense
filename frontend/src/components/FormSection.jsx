import React from 'react';
import './FormSection.css';

export default function FormSection({
  title,
  icon: Icon = null,
  description = '',
  badge = null,
  children,
  className = '',
}) {
  return (
    <div className={`form-section ${className}`}>
      <div className="form-section-header">
        <div className="section-title-wrapper">
          {Icon && (
            <span className="section-icon-box">
              <Icon size={18} />
            </span>
          )}
          <div>
            <h3 className="form-section-title">{title}</h3>
            {description && <p className="form-section-desc">{description}</p>}
          </div>
        </div>
        {badge && <div className="section-badge-wrapper">{badge}</div>}
      </div>
      <div className="form-section-body">{children}</div>
    </div>
  );
}
