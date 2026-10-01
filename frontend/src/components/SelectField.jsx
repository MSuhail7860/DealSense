import React from 'react';
import './FormFields.css';

export default function SelectField({
  id,
  name,
  label,
  value,
  onChange,
  options = [],
  description = '',
  error = '',
  required = false,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <div className={`form-field ${error ? 'has-error' : ''} ${className}`}>
      {label && (
        <div className="field-header">
          <label htmlFor={id} className="field-label">
            {label} {required && <span className="required-star" aria-hidden="true">*</span>}
          </label>
        </div>
      )}

      <div className="field-select-wrapper">
        <select
          id={id}
          name={name || id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : description ? `${id}-desc` : undefined}
          className="select-control"
          {...props}
        >
          {options.map((opt) => {
            const optVal = typeof opt === 'object' ? opt.value : opt;
            const optLabel = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={optVal} value={optVal}>
                {optLabel}
              </option>
            );
          })}
        </select>
        <span className="select-arrow" aria-hidden="true">
          ▾
        </span>
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
