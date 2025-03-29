/**
 * Authentication utilities to improve auth reliability and error handling
 */

import { User } from 'oidc-client-ts';

/**
 * Get the correct redirect URI based on environment
 */
const getRedirectUri = () => {
  const hostname = window.location.hostname;
  
  // Handle production environment with CloudFront
  if (hostname.includes('cloudfront.net') || process.env.NODE_ENV === 'production') {
    return "https://d84l1y8p4kdic.cloudfront.net";
  }
  
  // Handle localhost and development environments
  return window.location.origin;
};

/**
 * Manual authentication handler for situations where OIDC library fails
 */
export const manualAuth = {
  /**
   * Login with AWS Cognito with fallback mechanism
   */
  login: () => {
    try {
      const clientId = "4tlqh6j1gheqtj0chpjsiblqmp";
      const redirectUri = encodeURIComponent(getRedirectUri());
      const responseType = "code";
      const scope = encodeURIComponent("openid email profile");
      const cognitoDomain = "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_80F5GRLQb";
      
      // Generate PKCE code challenge
      const generateCodeVerifier = () => {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => 
          ('0' + (byte & 0xFF).toString(16)).slice(-2)
        ).join('');
      };
      
      // Store code verifier for later use
      const codeVerifier = generateCodeVerifier();
      sessionStorage.setItem('code_verifier', codeVerifier);
      
      // Add state parameter for CSRF protection
      const state = Math.random().toString(36).substring(2);
      sessionStorage.setItem('auth_state', state);
      
      // Redirect to login page
      window.location.href = `${cognitoDomain}/oauth2/authorize?client_id=${clientId}&response_type=${responseType}&scope=${scope}&redirect_uri=${redirectUri}&state=${state}&code_challenge=${codeVerifier}&code_challenge_method=S256`;
    } catch (error) {
      console.error('Manual login error:', error);
      // Last resort fallback - basic redirect
      window.location.href = getRedirectUri();
    }
  },
  
  /**
   * Logout with full cleanup
   */
  logout: () => {
    try {
      // Clear auth-related items from session storage
      sessionStorage.removeItem('oidc.user');
      sessionStorage.removeItem('code_verifier');
      sessionStorage.removeItem('auth_state');
      sessionStorage.removeItem('logoutState');
      
      // Clear possible cookies
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.split('=');
        if (name.trim().startsWith('oidc.')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
      
      // Redirect to logout endpoint for server-side session termination
      const clientId = "4tlqh6j1gheqtj0chpjsiblqmp";
      const logoutUri = encodeURIComponent(getRedirectUri());
      const cognitoDomain = "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_80F5GRLQb";
      
      window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${logoutUri}`;
    } catch (error) {
      console.error('Manual logout error:', error);
      // If all else fails, just reload the page
      window.location.href = getRedirectUri();
    }
  },
  
  /**
   * Check if there is an active authentication
   */
  isAuthenticated: (): boolean => {
    try {
      // Check for auth data in session storage
      const user = sessionStorage.getItem('oidc.user');
      if (!user) return false;
      
      // Parse user data and check expiration
      const userData = JSON.parse(user);
      
      if (!userData || !userData.expires_at) return false;
      
      // Check if token is expired (with 5 min buffer)
      return userData.expires_at > (Date.now() / 1000) + 300;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  },
  
  /**
   * Get user information from session storage
   */
  getUserInfo: (): { email?: string; name?: string; sub?: string } => {
    try {
      const user = sessionStorage.getItem('oidc.user');
      if (!user) return {};
      
      const userData = JSON.parse(user);
      if (!userData || !userData.profile) return {};
      
      return {
        email: userData.profile.email,
        name: userData.profile.name || userData.profile.preferred_username,
        sub: userData.profile.sub
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      return {};
    }
  },
  
  /**
   * Handle auth error recovery
   */
  recoverFromError: (error: Error): boolean => {
    console.error('Auth error recovery attempt:', error);
    
    try {
      // Clean session storage of any corrupted tokens
      sessionStorage.removeItem('oidc.user');
      
      // Special handling for redirect_mismatch errors
      if (error.message.includes('redirect_mismatch') || 
          window.location.href.includes('error=redirect_mismatch')) {
        console.warn('Redirect mismatch detected - this means your redirect URI in code does not match Cognito settings');
        return false; // We need to use manual auth
      }
      
      // Check if error is related to token refresh or validation
      if (error.message.includes('token') || 
          error.message.includes('expired') || 
          error.message.includes('validation')) {
        // For token issues, we need to re-authenticate
        return false;
      }
      
      // For network issues, we might want to retry later
      if (error.message.includes('network') || 
          error.message.includes('fetch') || 
          error.message.includes('connection')) {
        return true;
      }
      
      // Default fallback
      return false;
    } catch (recoveryError) {
      console.error('Error during auth recovery:', recoveryError);
      return false;
    }
  }
};

/**
 * Enhanced event handlers for auth events
 */
export const authEventHandlers = {
  /**
   * Handle successful login
   */
  onLoginSuccess: (user: User): void => {
    console.log('Login successful');
    
    // Clean up URL parameters to avoid security issues
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Trigger any onboarding or welcome flows here if needed
  },
  
  /**
   * Handle login error
   */
  onLoginError: (error: Error): void => {
    console.error('Login error:', error);
    
    // Log detailed error information for debugging
    console.error('Login error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      url: window.location.href // Include current URL for debugging redirect issues
    });
    
    // For certain error types, try recovery
    if (error.message.includes('popup') || error.message.includes('silent')) {
      console.log('Attempting alternative login flow');
      // Could implement retries or different login flows here
    }
  },
  
  /**
   * Handle silent renew error
   */
  onSilentRenewError: (error: Error): void => {
    console.error('Silent renew error:', error);
    
    // For token refresh errors, we might need to prompt for re-authentication
    if (error.message.includes('token') || error.message.includes('expired')) {
      console.log('Token refresh failed, may need re-authentication');
      // Could store this state and prompt user to re-login
    }
  }
}; 