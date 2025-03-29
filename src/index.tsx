import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AuthProvider } from "react-oidc-context";
import { WebStorageStateStore } from "oidc-client-ts";

// Error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // Check if it's an auth-related error
  if (event.reason && typeof event.reason === 'object' && 'message' in event.reason) {
    const errorMsg = String(event.reason.message);
    if (errorMsg.includes('oidc') || errorMsg.includes('token') || 
        errorMsg.includes('auth') || errorMsg.includes('authentication')) {
      console.warn('Auth-related error detected:', errorMsg);
      
      // We'll let the auth recovery logic in App.tsx handle it
      // This just prevents the error from breaking the entire app
    }
  }
});

// Fix for Cognito redirect_mismatch error
const getRedirectUri = () => {
  const hostname = window.location.hostname;
  
  // Handle production environment with CloudFront
  if (hostname.includes('cloudfront.net')) {
    // Use the actual hostname from the current URL instead of hardcoding
    return `${window.location.protocol}//${window.location.host}`;
  } else if (import.meta.env.PROD) {
    // For other production environments
    return `${window.location.protocol}//${window.location.host}`;
  }
  
  // Handle localhost and development environments
  return window.location.origin;
};

// Enhanced Cognito configuration with additional security settings and error handling
const cognitoAuthConfig = {
  authority: "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_80F5GRLQb",
  client_id: "4tlqh6j1gheqtj0chpjsiblqmp",
  redirect_uri: getRedirectUri(),
  post_logout_redirect_uri: getRedirectUri(),
  // Use code flow with PKCE for better security
  response_type: "code",
  scope: "openid email profile", // Optimized scope list
  // Modern security features
  automaticSilentRenew: true,
  loadUserInfo: true,
  revokeTokensOnSignout: true,
  // More secure token storage
  userStore: new WebStorageStateStore({ 
    store: window.sessionStorage // Use sessionStorage instead of localStorage for better security
  }),
  // PKCE Configuration
  useSilentRefresh: true,
  // Use secure token validation
  validateSubOnSilentRenew: true,
  // Additional security-related settings
  monitorSession: true,
  checkSessionInterval: 10 * 60, // 10 minutes
  // Security and performance settings
  extraQueryParams: {
    max_age: 3600 // 1 hour max session age
  },
  // Better error handling
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
  // Handle silentRenewError more gracefully
  silentRequestTimeoutInSeconds: 10
};

// Force HTTPS in production
if (process.env.NODE_ENV === "production" && window.location.protocol === "http:") {
  window.location.href = window.location.href.replace("http:", "https:");
}

// Create application root
const rootElement = document.getElementById("app") || document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element 'app' or 'root' not found");
}

try {
  createRoot(rootElement as HTMLElement).render(
  <StrictMode>
      <AuthProvider {...cognitoAuthConfig}>
    <App />
      </AuthProvider>
  </StrictMode>,
);
} catch (error) {
  console.error('Error initializing application:', error);
  
  // Render a basic error page if initialization fails
  createRoot(rootElement as HTMLElement).render(
    <div className="min-h-screen bg-gradient-to-br from-[#2b2641] to-[#1a1625] flex items-center justify-center p-4">
      <div className="bg-red-900/50 p-6 rounded-lg border border-red-500/50 text-center max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">Application Error</h2>
        <p className="text-red-200 mb-4">
          There was a problem initializing the application. Please try reloading the page.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-md"
        >
          Reload Application
        </button>
      </div>
    </div>
  );
}