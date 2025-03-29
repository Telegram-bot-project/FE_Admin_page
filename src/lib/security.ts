/**
 * Security utilities for the application
 */

import { User } from "oidc-client-ts";

// Define AuthenticationResult interface based on actual structure
interface AuthenticationResult {
  access_token?: string;
  expires_at?: number;
  profile?: any;
  [key: string]: any;
}

/**
 * Token handling utilities
 */
export const TokenUtils = {
  /**
   * Securely extract the JWT token from the auth result
   */
  extractToken: (authResult: AuthenticationResult | null | undefined): string | null => {
    if (!authResult) return null;
    return authResult.access_token || null;
  },

  /**
   * Verify the token expiration
   */
  isTokenExpired: (authResult: AuthenticationResult | null | undefined): boolean => {
    if (!authResult || !authResult.expires_at) return true;
    // Add 5 minute buffer for clock skew
    return authResult.expires_at < Date.now() / 1000 + 300;
  },

  /**
   * Get authorization header with bearer token
   */
  getAuthHeader: (authResult: AuthenticationResult | null | undefined): { Authorization: string } | undefined => {
    const token = TokenUtils.extractToken(authResult);
    if (!token) return undefined;
    return { Authorization: `Bearer ${token}` };
  },

  /**
   * Get user info from token
   */
  getUserInfo: (user: User | null | undefined): { email?: string; name?: string; sub?: string } => {
    if (!user || !user.profile) return {};
    
    return {
      email: user.profile.email,
      name: user.profile.name || user.profile.preferred_username,
      sub: user.profile.sub
    };
  }
};

/**
 * CSRF protection utilities
 */
export const CSRFUtils = {
  /**
   * Generate a secure random token for CSRF protection
   */
  generateToken: (): string => {
    // Crypto API is more secure than Math.random()
    try {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return Array.from(array, byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
    } catch (error) {
      console.error('Error generating CSRF token:', error);
      // Fallback with warning
      console.warn('Using less secure fallback for CSRF token');
      return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    }
  },

  /**
   * Store a CSRF token in session storage
   */
  storeToken: (tokenName: string, token: string): void => {
    try {
      sessionStorage.setItem(tokenName, token);
    } catch (error) {
      console.error('Error storing CSRF token:', error);
    }
  },

  /**
   * Validate a CSRF token against stored value
   */
  validateToken: (tokenName: string, token: string): boolean => {
    try {
      const storedToken = sessionStorage.getItem(tokenName);
      if (!storedToken || !token) return false;
      
      // Use constant-time comparison to prevent timing attacks
      return timingSafeEqual(storedToken, token);
    } catch (error) {
      console.error('Error validating CSRF token:', error);
      return false;
    }
  },

  /**
   * Clean up CSRF token after use
   */
  clearToken: (tokenName: string): void => {
    try {
      sessionStorage.removeItem(tokenName);
    } catch (error) {
      console.error('Error clearing CSRF token:', error);
    }
  }
};

/**
 * Constant-time comparison function to prevent timing attacks
 * when comparing security-sensitive strings
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Security headers utility
 */
export const SecurityHeaders = {
  /**
   * Get recommended security headers for fetch requests
   */
  getSecureHeaders: (authResult?: AuthenticationResult): HeadersInit => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': 'no-store, max-age=0'
    };

    // Add auth header if authentication result is provided
    if (authResult) {
      const authHeader = TokenUtils.getAuthHeader(authResult);
      if (authHeader) {
        headers.Authorization = authHeader.Authorization;
      }
    }

    return headers;
  },
  
  /**
   * Get headers for file uploads
   */
  getUploadHeaders: (authResult?: AuthenticationResult): HeadersInit => {
    const headers: HeadersInit = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': 'no-store, max-age=0'
    };

    // Add auth header if authentication result is provided
    if (authResult) {
      const authHeader = TokenUtils.getAuthHeader(authResult);
      if (authHeader) {
        headers.Authorization = authHeader.Authorization;
      }
    }

    return headers;
  }
};

/**
 * General security utilities
 */
export const SecurityUtils = {
  /**
   * Sanitize user input to prevent XSS
   */
  sanitizeInput: (input: string | null | undefined): string => {
    if (input === null || input === undefined) return '';
    
    return String(input)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Check if we're running in a secure context (HTTPS)
   */
  isSecureContext: (): boolean => {
    return window.isSecureContext;
  },

  /**
   * Force redirect to HTTPS if on HTTP
   */
  enforceHttps: (): void => {
    if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
      window.location.href = window.location.href.replace('http:', 'https:');
    }
  },

  /**
   * Clear sensitive data from storage
   */
  clearSensitiveData: (): void => {
    try {
      // Clear any tokens or user data from sessionStorage
      sessionStorage.removeItem('oidc.user');
      sessionStorage.removeItem('logoutState');
      
      // Clear any auth tokens from cookies
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.split('=');
        if (name.trim().startsWith('oidc.')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
    } catch (error) {
      console.error('Error clearing sensitive data:', error);
    }
  },
  
  /**
   * Validate if a string is a valid URL
   */
  isValidUrl: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}; 