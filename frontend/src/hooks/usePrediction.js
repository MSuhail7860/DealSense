import { useState, useCallback } from 'react';
import { predictDeal } from '../api/predictionApi';
import { validateDealFeatures } from '../utils/validation';

const HISTORY_KEY = 'dealsense_prediction_history';

export function usePrediction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const executePrediction = useCallback(async (features) => {
    setError(null);
    setValidationErrors({});

    const validation = validateDealFeatures(features);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return null;
    }

    setLoading(true);

    try {
      const prediction = await predictDeal(features);
      const enrichedResult = {
        ...prediction,
        inputs: { ...features },
        timestamp: new Date().toISOString(),
      };

      setResult(enrichedResult);

      // Save to recent runs in localStorage for Results dashboard comparison
      try {
        const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        const updated = [enrichedResult, ...stored.slice(0, 9)];
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not cache history:', e);
      }

      return enrichedResult;
    } catch (err) {
      setError(err.message || 'An error occurred while generating prediction.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPrediction = useCallback(() => {
    setResult(null);
    setError(null);
    setValidationErrors({});
  }, []);

  return {
    loading,
    error,
    result,
    validationErrors,
    executePrediction,
    resetPrediction,
    setResult,
  };
}

export function getPredictionHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}
