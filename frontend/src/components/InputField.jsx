import React from 'react';
import './FormFields.css';

export default function InputField({
  id,
  name,
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  description = '',
  error = '',
  required = false,
  min,
  max,
  step,
  prefix = null,
  suffix = null,
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

      <div className="field-input-wrapper">
        {prefix && <span className="input-affix input-prefix">{prefix}</span>}
        <input
          id={id}
          name={name || id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : description ? `${id}-desc` : undefined}
          className={`input-control ${prefix ? 'has-prefix' : ''} ${suffix ? 'has-suffix' : ''}`}
          {...props}
        />
        {suffix && <span className="input-affix input-suffix">{suffix}</span>}
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
