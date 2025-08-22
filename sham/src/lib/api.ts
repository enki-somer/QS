// Shared API configuration and utilities

// Dynamic API base URL - works for both development and production
const getApiBaseUrl = () => {
  // Check for production environment variable first
  if (process.env.NEXT_PUBLIC_API_URL) {
    console.log('🔍 Debug: Using NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined') {
    // Client-side: use current domain for production, localhost for development
    const { hostname, protocol } = window.location;
    console.log('🔍 Debug: Window location - hostname:', hostname, 'protocol:', protocol);
    
    // Enforce HTTPS in production
    if (process.env.NODE_ENV === 'production' && protocol === 'http:') {
      window.location.href = window.location.href.replace('http:', 'https:');
      return '';
    }
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const localhostUrl = 'http://localhost:8000/api';
      console.log('🔍 Debug: Using localhost URL:', localhostUrl);
      return localhostUrl;
    }
    const productionUrl = `${protocol}//${hostname}/api`;
    console.log('🔍 Debug: Using production URL:', productionUrl);
    return productionUrl;
  }
  // Server-side: fallback to localhost for SSR
  const fallbackUrl = 'http://localhost:8000/api';
  console.log('🔍 Debug: Using fallback URL:', fallbackUrl);
  return fallbackUrl;
};

// TEMPORARY FIX: Hardcode the correct API base URL to resolve all 404 errors
export const API_BASE_URL = 'http://localhost:8000/api';
console.log('🔍 Debug: Final API_BASE_URL =', API_BASE_URL);

// Auth token utilities with enhanced security
export const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    try {
      const tokenData = localStorage.getItem('financial-auth-token');
      console.log('🔍 Debug: Raw token data from localStorage:', tokenData);
      if (!tokenData) return null;
      
      // Try to parse as new format first
      try {
        const parsed = JSON.parse(tokenData);
        console.log('🔍 Debug: Parsed token data:', parsed);
        return parsed.token || tokenData; // Return token from new format or fallback to old
      } catch {
        // If parsing fails, it's the old format - return as is
        console.log('🔍 Debug: Using old token format:', tokenData);
        return tokenData;
      }
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return null;
    }
  }
  return null;
};

export const setAuthToken = (token: string) => {
  if (typeof window !== 'undefined') {
    try {
      // Store token with expiration check - 24 hours from now
      const tokenData = {
        token,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      console.log('🔍 Debug: Storing token data:', tokenData);
      localStorage.setItem('financial-auth-token', JSON.stringify(tokenData));
    } catch (error) {
      console.error('Error setting auth token:', error);
    }
  }
};

export const removeAuthToken = () => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('financial-auth-token');
    } catch (error) {
      console.error('Error removing auth token:', error);
    }
  }
};

export const getAuthUser = () => {
  if (typeof window !== 'undefined') {
    try {
      const user = localStorage.getItem('financial-auth-user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Error parsing auth user:', error);
      return null;
    }
  }
  return null;
};

export const setAuthUser = (user: any) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('financial-auth-user', JSON.stringify(user));
    } catch (error) {
      console.error('Error setting auth user:', error);
    }
  }
};

export const removeAuthUser = () => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('financial-auth-user');
    } catch (error) {
      console.error('Error removing auth user:', error);
    }
  }
};

// Check if token is expired
export const isTokenExpired = (): boolean => {
  try {
    const tokenData = localStorage.getItem('financial-auth-token');
    console.log('🔍 Debug: isTokenExpired - Raw token data:', tokenData);
    if (!tokenData) {
      console.log('🔍 Debug: No token found, returning expired = true');
      return true;
    }
    
    const { expiresAt } = JSON.parse(tokenData);
    const now = Date.now();
    const isExpired = now > expiresAt;
    console.log('🔍 Debug: Token expiresAt:', new Date(expiresAt), 'Now:', new Date(now), 'IsExpired:', isExpired);
    return isExpired;
  } catch (error) {
    console.log('🔍 Debug: Error parsing token, returning expired = true:', error);
    return true;
  }
};

// API request wrapper with auth headers and CORS handling
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  // Check if token is expired
  if (isTokenExpired()) {
    removeAuthToken();
    removeAuthUser();
    throw new Error('Token expired');
  }

  const token = getAuthToken();
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    // Token is already extracted and formatted by getAuthToken
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
    
    // Handle token expiration
    if (response.status === 401) {
      removeAuthToken();
      removeAuthUser();
      window.location.href = '/login';
      throw new Error('Authentication required');
    }
    
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