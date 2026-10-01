// In browser development, relative URLs route through Vite's dev server proxy,
// eliminating any browser CORS hurdles. If explicit env vars are set, use those.
const isDev = import.meta.env.DEV;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (isDev ? '' : 'http://localhost:8000');
const ML_API_BASE_URL = import.meta.env.VITE_ML_API_BASE_URL || (isDev ? '/ml' : 'http://localhost:8001');
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/scores';

export { API_BASE_URL, ML_API_BASE_URL, WS_BASE_URL };

/**
 * Custom application error with HTTP status and user-friendly messaging
 */
export class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Centralized fetch wrapper with timeout, json parsing, and error normalization
 */
export async function request(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Attach auth token if available in localStorage
  const token = localStorage.getItem('dealsense_auth_token');
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Empty responses (204 No Content)
    if (response.status === 204) {
      return null;
    }

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      if (typeof data === 'object' && data !== null) {
        if (data.detail) {
          // FastAPI returns 'detail'
          if (Array.isArray(data.detail)) {
            errorMessage = data.detail.map((d) => `${d.loc?.join('.') || 'field'}: ${d.msg}`).join(', ');
          } else {
            errorMessage = data.detail;
          }
        } else if (data.message) {
          errorMessage = data.message;
        }
      }
      throw new ApiError(errorMessage, response.status, data);
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new ApiError(
        'Request timed out. The service may be busy or starting up.',
        408
      );
    }

    if (error instanceof ApiError) {
      throw error;
    }

    // Network / connection refused error
    throw new ApiError(
      'Unable to connect to the server. Please check if the service is running.',
      0,
      { originalError: error.message }
    );
  }
}
