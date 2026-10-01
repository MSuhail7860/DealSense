import React from 'react';
import './SectionHeading.css';

export default function SectionHeading({
  badge = '',
  title,
  subtitle = '',
  alignment = 'center',
  className = '',
}) {
  return (
    <div className={`section-heading align-${alignment} ${className}`}>
      {badge && <div className="section-heading-badge"><span className="badge badge-primary">{badge}</span></div>}
      <h2 className="section-heading-title">{title}</h2>
      {subtitle && <p className="section-heading-subtitle">{subtitle}</p>}
    </div>
  );
}
