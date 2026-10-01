import { useState, useCallback } from 'react';
import { getDealSuggestion, acceptSuggestion } from '../api/recommendationApi';

const SUGGESTIONS_KEY = 'dealsense_saved_suggestions';

export function useCopilot() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SUGGESTIONS_KEY) || '[]');
    } catch {
      return [];
    }
  });

  const requestSuggestion = useCallback(async (dealId, prompt, dealContext) => {
    setLoading(true);
    setError(null);

    try {
      const data = await getDealSuggestion(dealId, prompt, dealContext);
      
      const newSuggestion = {
        ...data,
        dealContext: dealContext || null,
      };

      setSuggestions((prev) => {
        const next = [newSuggestion, ...prev];
        try {
          localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(next.slice(0, 20)));
        } catch (e) {
          console.warn('Failed to persist suggestions:', e);
        }
        return next;
      });

      return newSuggestion;
    } catch (err) {
      setError(err.message || 'Failed to generate recommendation.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const markAccepted = useCallback(async (dealId, suggestionId) => {
    try {
      await acceptSuggestion(dealId, suggestionId);
      setSuggestions((prev) => {
        const updated = prev.map((s) =>
          s.id === suggestionId ? { ...s, accepted: true } : s
        );
        try {
          localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(updated));
        } catch (e) {
          console.warn('Failed to update suggestion storage:', e);
        }
        return updated;
      });
    } catch (err) {
      console.error('Failed to mark suggestion accepted:', err);
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    try {
      localStorage.removeItem(SUGGESTIONS_KEY);
    } catch {}
  }, []);

  return {
    loading,
    error,
    suggestions,
    requestSuggestion,
    markAccepted,
    clearSuggestions,
  };
}
