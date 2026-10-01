import React from 'react';
import './FormFields.css';

export default function SliderField({
  id,
  name,
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  description = '',
  displayFormat = (val) => val,
  badge = null,
  error = '',
  required = false,
  className = '',
}) {
  return (
    <div className={`form-field ${error ? 'has-error' : ''} ${className}`}>
      <div className="field-header">
        <label htmlFor={id} className="field-label">
          {label} {required && <span className="required-star" aria-hidden="true">*</span>}
        </label>
        <div className="slider-value-badge">
          {badge}
          <span className="slider-current-val">{displayFormat(value)}</span>
        </div>
      </div>

      <div className="slider-wrapper">
        <input
          id={id}
          name={name || id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          className="slider-control"
        />
        <div className="slider-ticks">
          <span>{displayFormat(min)}</span>
          <span>{displayFormat((min + max) / 2)}</span>
          <span>{displayFormat(max)}</span>
        </div>
      </div>

      {description && !error && (
        <p id={`${id}-desc`} className="field-description">
          {description}
        </p>
      )}

      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          <span className="error-icon" aria-hidden="true">⚠️</span> {error}
        </p>
      )}
    </div>
  );
}
