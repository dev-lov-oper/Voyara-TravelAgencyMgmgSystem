import React, { useState } from 'react';

/**
 * BudgetFilter Component (TAMS-10)
 * Provides minimum and maximum budget filtering controls with validation,
 * clear labeling, non-negative validation, and desktop/mobile accessibility.
 *
 * @param {Object} props
 * @param {number|null} [props.minBudget] - Active applied minimum budget
 * @param {number|null} [props.maxBudget] - Active applied maximum budget
 * @param {Function} props.onApply - Callback invoked with { min, max } when valid filters are applied
 * @param {Function} props.onClear - Callback invoked when filters are cleared
 */
export default function BudgetFilter({
  minBudget = null,
  maxBudget = null,
  onApply,
  onClear,
}) {
  const [minInput, setMinInput] = useState(
    minBudget !== null && minBudget !== undefined ? String(minBudget) : ''
  );
  const [maxInput, setMaxInput] = useState(
    maxBudget !== null && maxBudget !== undefined ? String(maxBudget) : ''
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [prevMin, setPrevMin] = useState(minBudget);
  const [prevMax, setPrevMax] = useState(maxBudget);

  // Synchronize internal input values when external applied props change (e.g. cleared via Reset)
  if (minBudget !== prevMin) {
    setPrevMin(minBudget);
    setMinInput(minBudget !== null && minBudget !== undefined ? String(minBudget) : '');
  }

  if (maxBudget !== prevMax) {
    setPrevMax(maxBudget);
    setMaxInput(maxBudget !== null && maxBudget !== undefined ? String(maxBudget) : '');
  }

  const handleSubmit = (e) => {
    if (e) e.preventDefault();

    const trimmedMin = minInput.trim();
    const trimmedMax = maxInput.trim();

    // Check non-negative numeric constraints
    if (trimmedMin !== '') {
      const minVal = Number(trimmedMin);
      if (isNaN(minVal) || minVal < 0) {
        setErrorMessage('Minimum budget must be a non-negative number.');
        return;
      }
    }

    if (trimmedMax !== '') {
      const maxVal = Number(trimmedMax);
      if (isNaN(maxVal) || maxVal < 0) {
        setErrorMessage('Maximum budget must be a non-negative number.');
        return;
      }
    }

    // Check min <= max constraint when both are supplied
    if (trimmedMin !== '' && trimmedMax !== '') {
      const minVal = Number(trimmedMin);
      const maxVal = Number(trimmedMax);
      if (minVal > maxVal) {
        setErrorMessage('Minimum budget cannot exceed maximum budget.');
        return;
      }
    }

    // Valid inputs: clear errors and invoke onApply
    setErrorMessage('');
    if (onApply) {
      onApply({
        min: trimmedMin !== '' ? Number(trimmedMin) : null,
        max: trimmedMax !== '' ? Number(trimmedMax) : null,
      });
    }
  };

  const handleClear = () => {
    setMinInput('');
    setMaxInput('');
    setErrorMessage('');
    if (onClear) {
      onClear();
    }
  };

  const handleBlur = () => {
    const trimmedMin = minInput.trim();
    const trimmedMax = maxInput.trim();

    if (trimmedMin === '' && trimmedMax === '') {
      if (minBudget !== null || maxBudget !== null) {
        if (onClear) onClear();
      }
      return;
    }

    const minVal = trimmedMin !== '' ? Number(trimmedMin) : null;
    const maxVal = trimmedMax !== '' ? Number(trimmedMax) : null;

    if (minVal !== null && (isNaN(minVal) || minVal < 0)) return;
    if (maxVal !== null && (isNaN(maxVal) || maxVal < 0)) return;
    if (minVal !== null && maxVal !== null && minVal > maxVal) return;

    if (onApply) {
      onApply({ min: minVal, max: maxVal });
    }
  };

  const isMinError = Boolean(
    errorMessage &&
      (errorMessage.toLowerCase().includes('minimum') || errorMessage.includes('cannot exceed'))
  );
  const isMaxError = Boolean(
    errorMessage &&
      (errorMessage.toLowerCase().includes('maximum') || errorMessage.includes('cannot exceed'))
  );

  return (
    <div className="budget-filter-container">
      <form
        className="budget-filter-form"
        onSubmit={handleSubmit}
        role="search"
        aria-label="Filter packages by budget"
      >
        <div className="budget-filter-fields">
          {/* Minimum Budget Input */}
          <div className="budget-input-group">
            <label htmlFor="min-budget-input" className="budget-input-label">
              Minimum Budget (₹)
            </label>
            <div className={`budget-input-wrapper ${isMinError ? 'has-error' : ''}`}>
              <span className="budget-currency-prefix" aria-hidden="true">
                ₹
              </span>
              <input
                id="min-budget-input"
                name="minBudget"
                type="number"
                min="0"
                step="any"
                placeholder="0"
                className="budget-number-input"
                value={minInput}
                onChange={(e) => {
                  setMinInput(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                onBlur={handleBlur}
                aria-invalid={isMinError}
                aria-describedby={errorMessage ? 'budget-filter-error' : undefined}
              />
            </div>
          </div>

          {/* Maximum Budget Input */}
          <div className="budget-input-group">
            <label htmlFor="max-budget-input" className="budget-input-label">
              Maximum Budget (₹)
            </label>
            <div className={`budget-input-wrapper ${isMaxError ? 'has-error' : ''}`}>
              <span className="budget-currency-prefix" aria-hidden="true">
                ₹
              </span>
              <input
                id="max-budget-input"
                name="maxBudget"
                type="number"
                min="0"
                step="any"
                placeholder="No limit"
                className="budget-number-input"
                value={maxInput}
                onChange={(e) => {
                  setMaxInput(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                onBlur={handleBlur}
                aria-invalid={isMaxError}
                aria-describedby={errorMessage ? 'budget-filter-error' : undefined}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="budget-filter-actions">
            <button
              type="submit"
              className="budget-btn budget-btn-apply"
              id="apply-budget-filter-btn"
            >
              Apply Filters
            </button>
            <button
              type="button"
              className="budget-btn budget-btn-clear"
              id="clear-budget-filter-btn"
              onClick={handleClear}
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Validation Error Message */}
        {errorMessage && (
          <div
            id="budget-filter-error"
            className="budget-filter-validation-error"
            role="alert"
            aria-live="polite"
          >
            <svg
              viewBox="0 0 20 20"
              width="16"
              height="16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}
      </form>
    </div>
  );
}
