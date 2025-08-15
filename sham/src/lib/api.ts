// Shared API configuration and utilities

// Dynamic API base URL - works for both development and production
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use current domain for production, localhost for development
    const { hostname, protocol } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000/api';
    }
    return `${protocol}//${hostname}/api`;
  }
  // Server-side: fallback to localhost for SSR
  return 'http://localhost:8000/api';
};

export const API_BASE_URL = getApiBaseUrl();

// Auth token utilities
export const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('financial-auth-token');
  }
  return null;
};

export const setAuthToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('financial-auth-token', token);
  }
};

export const removeAuthToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('financial-auth-token');
  }
};

export const getAuthUser = () => {
  if (typeof window !== 'undefined') {
    const user = localStorage.getItem('financial-auth-user');
    return user ? JSON.parse(user) : null;
  }
  return null;
};

export const setAuthUser = (user: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('financial-auth-user', JSON.stringify(user));
  }
};

export const removeAuthUser = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('financial-auth-user');
  }
};

// API request wrapper with auth headers and CORS handling
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }
  
  const config: RequestInit = {
    ...options,
    mode: 'cors', // Explicitly set CORS mode
    credentials: 'include', // Include credentials for CORS
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };
  
  try {
    const response = await fetch(url, config);
    
    // If response is not ok and it's a CORS/network error, log for debugging
    if (!response.ok && response.status === 0) {
      console.error('CORS/Network error for:', url);
      console.error('Request config:', config);
    }
    
    return response;
  } catch (error) {
    console.error('API Request failed:', error);
    console.error('URL:', url);
    console.error('Config:', config);
    throw error;
  }
}; 