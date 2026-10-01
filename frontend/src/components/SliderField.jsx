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
  leftLabel = null,
  centerLabel = null,
  rightLabel = null,
  badge = null,
  error = '',
  required = false,
  className = '',
}) {
  const numMin = Number(min);
  const numMax = Number(max);
  const midVal = (numMin + numMax) / 2;

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
          min={numMin}
          max={numMax}
          step={step}
          value={value}
          onChange={onChange}
          aria-valuemin={numMin}
          aria-valuemax={numMax}
          aria-valuenow={Number(value)}
          aria-valuetext={String(displayFormat(value))}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : description ? `${id}-desc` : undefined}
          aria-required={required}
          className="slider-control"
        />
        <div className="slider-ticks">
          <span>{leftLabel || displayFormat(numMin)}</span>
          <span>{centerLabel || displayFormat(midVal)}</span>
          <span>{rightLabel || displayFormat(numMax)}</span>
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
