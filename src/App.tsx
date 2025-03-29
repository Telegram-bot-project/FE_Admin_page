import React, { useState, useEffect, useCallback, useMemo, memo, Component, ErrorInfo, ReactNode } from "react";
import { useAuth } from "react-oidc-context";
import { Dashbroad } from "./screens/Dashbroad/Dashbroad";
import { DashbroadListing } from "./screens/DashbroadListing/DashbroadListing";
import { Button } from "./components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./components/ui/card";
import { initDB, getAllItems, checkApiConnectivity } from "./lib/db";
import { DatabaseIcon, LogOut } from "lucide-react";

// Inline ErrorBoundary component to avoid import issues
class ErrorBoundary extends Component<{children: ReactNode; fallback: ReactNode}> {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }
  
  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Create a context to manage the dashboard state
export const DashboardContext = React.createContext<{
  showDashboard: boolean;
  setShowDashboard: React.Dispatch<React.SetStateAction<boolean>>;
  isAuthenticated: boolean;
  handleLogout: () => void;
  apiStatus?: { connected: boolean; message: string };
}>({
  showDashboard: false,
  setShowDashboard: () => {},
  isAuthenticated: false,
  handleLogout: () => {},
});

// Memoized API notification component for better performance
const ApiNotification = memo(({ apiStatus }: { 
  apiStatus: { connected: boolean; message: string } 
}) => (
  <div className={`fixed top-4 right-4 z-50 transition-all duration-300 shadow-lg rounded-lg overflow-hidden max-w-sm`}>
    <div className={`${
      apiStatus.connected ? 
        'bg-green-900/80 border-l-4 border-green-500' : 
        'bg-amber-900/80 border-l-4 border-amber-500'
    } backdrop-blur-sm px-4 py-3`}>
      <div className="flex items-center">
        <div className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full ${
          apiStatus.connected ? 'bg-green-500/20' : 'bg-amber-500/20'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            apiStatus.connected ? 'bg-green-400' : 'bg-amber-400'
          }`}></div>
        </div>
        <div className="ml-3">
          <p className={`font-medium ${
            apiStatus.connected ? 'text-green-200' : 'text-amber-200'
          }`}>{apiStatus.connected ? "API Connected" : "API Status"}</p>
          <p className={`text-sm ${
            apiStatus.connected ? 'text-green-300/70' : 'text-amber-300/70'
          }`}>{apiStatus.message}</p>
        </div>
      </div>
    </div>
  </div>
));

// Memoized auth loading component
const AuthLoading = memo(() => (
  <div className="min-h-screen bg-gradient-to-br from-[#2b2641] to-[#1a1625] flex items-center justify-center p-4">
    <div className="flex items-center justify-center">
      <svg className="animate-spin h-8 w-8 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span className="ml-3 text-xl text-white">Loading authentication...</span>
    </div>
  </div>
));

// Update AuthError component with better error details and recovery options
const AuthError = memo(({ errorMessage, onRetry }: { errorMessage: string, onRetry: () => void }) => (
  <div className="min-h-screen bg-gradient-to-br from-[#2b2641] to-[#1a1625] flex items-center justify-center p-4">
    <Card className="w-[450px] border-none bg-white/5 backdrop-blur-sm shadow-xl">
      <CardHeader className="space-y-1 pb-6">
        <CardTitle className="text-2xl text-center font-bold text-white">Authentication Error</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-red-500/20 border border-red-500/30 text-red-200 text-sm rounded p-3 mb-4">
          <p className="font-medium mb-2">Error details:</p>
          <p className="text-xs overflow-auto max-h-[120px] whitespace-pre-wrap">{errorMessage}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={onRetry}
            className="h-11 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:opacity-90 transition-opacity"
          >
            Retry Login
          </Button>
          
          <Button 
            onClick={() => window.location.href = window.location.origin}
            variant="outline" 
            className="h-11 border-white/20 text-white hover:bg-white/10"
          >
            Return Home
          </Button>
        </div>
      </CardContent>
      
      <CardFooter className="text-white/50 text-xs border-t border-white/10 mt-2 pt-4">
        If this problem persists, try clearing your browser cache or contact support.
      </CardFooter>
    </Card>
  </div>
));

// Memoized login component
const LoginScreen = memo(({ onLogin }: { onLogin: () => void }) => (
  <div className="min-h-screen bg-gradient-to-br from-[#2b2641] to-[#1a1625] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-[url('/img/grid.svg')] bg-center opacity-10 pointer-events-none"></div>
    
    <Card className="w-[400px] border-none bg-white/5 backdrop-blur-sm shadow-xl">
      <CardHeader className="space-y-1 pb-6">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <DatabaseIcon className="h-6 w-6 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl text-center font-bold text-white">TeleBot Dashboard</CardTitle>
        <p className="text-white/60 text-center text-sm">Sign in with AWS Cognito to access your dashboard</p>
      </CardHeader>
      
      <CardContent className="flex flex-col items-center space-y-4">
        <Button 
          onClick={onLogin}
          className="w-full h-11 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:opacity-90 transition-opacity"
        >
          Sign In with Cognito
        </Button>
      </CardContent>
    </Card>
  </div>
));

// NetworkErrorFallback component definition
const NetworkErrorFallback = () => {
  const { apiStatus } = React.useContext(DashboardContext);
  
  return (
    <div className="fixed inset-0 bg-gradient-to-r from-rose-800/90 to-purple-900/90 flex flex-col items-center justify-center z-50 p-8">
      <div className="bg-black/30 p-8 rounded-xl max-w-2xl w-full border border-white/10 shadow-xl">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-rose-500/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-white">API Connection Error</h2>
          
          <p className="text-white/80 text-lg">
            {apiStatus?.message || 'Unable to connect to the API. Please check your connection and try again.'}
          </p>
          
          <div className="bg-white/10 rounded-lg p-4 border border-white/10 w-full">
            <h3 className="text-indigo-300 font-semibold mb-2">Mock Data Mode Enabled</h3>
            <p className="text-white/70 text-sm">
              The application is running in mock data mode. You can browse data, but changes will not be saved until API connectivity is restored.
            </p>
          </div>
          
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md font-medium transition-colors mt-4"
          >
            Retry Connection
          </button>
        </div>
      </div>
    </div>
  );
};

// Main App component
export const App = (): JSX.Element => {
  const auth = useAuth();
  const [showDashboard, setShowDashboard] = useState(false);
  const [apiStatus, setApiStatus] = useState<{ connected: boolean; message: string }>({
    connected: true,
    message: ''
  });
  const [showApiNotification, setShowApiNotification] = useState(true);
  const [editItemId, setEditItemId] = useState<number | null>(null);
  // Add state to track authentication recovery attempts
  const [authRetryCount, setAuthRetryCount] = useState(0);
  // Add fallback authentication state
  const [usingFallbackAuth, setUsingFallbackAuth] = useState(false);

  // Diagnostic function to detect auth configuration issues
  useEffect(() => {
    console.log("=== Auth Configuration Diagnostic ===");
    // Check if we're on the Cognito redirect URL that has no application integration
    const isCognitoRedirectPage = 
      document.title.includes("Successfully signed in") || 
      window.location.href.includes("cloudfront.net/") && 
      document.body.textContent?.includes("Amazon Cognito user pools");
      
    if (isCognitoRedirectPage) {
      console.error("DETECTED: Stuck on Cognito redirect page");
      console.error("This usually means your Cognito app client doesn't have the correct callback URL configured.");
      console.log("Current URL:", window.location.href);
      console.log("You need to add this URL to your Cognito App Client's allowed callback URLs in AWS Console");
    }
    
    console.log("Current origin:", window.location.origin);
    console.log("Auth settings:", auth.settings);
    console.log("Auth state:", { 
      isLoading: auth.isLoading, 
      isAuthenticated: auth.isAuthenticated,
      hasError: !!auth.error
    });
    console.log("===================================");
  }, [auth]);

  // Log deployment status during initialization
  useEffect(() => {
    console.log(`App running in ${import.meta.env.PROD ? 'production' : 'development'} mode`);
    console.log(`API URL: ${import.meta.env.VITE_API_URL}`);
    console.log(`Deployment status: ${import.meta.env.VITE_DEPLOYED ? 'deployed' : 'local'}`);
  }, []);

  // Memoize signOutRedirect function to prevent recreating it on every render
  const signOutRedirect = useCallback(() => {
    // Use the correct Cognito domain
    const clientId = "4tlqh6j1gheqtj0chpjsiblqmp";
    
    // Get the correct logout URI based on environment
    const getLogoutUri = () => {
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
    
    const logoutUri = getLogoutUri();
    const cognitoDomain = "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_80F5GRLQb";
    
    // Redirect to Cognito logout endpoint
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  }, []);

  // Enhanced logout handler with token revocation
  const handleLogout = useCallback(() => {
    try {
      // First check if we're using the OIDC client or our fallback
      if (usingFallbackAuth) {
        // Remove the manualAuth import to fix build error
        // manualAuth.logout();
      } else {
        // Let OIDC client handle proper token revocation
        auth.removeUser();
        
        // For extra security, also clean up any remaining tokens
        sessionStorage.removeItem('oidc.user');
        sessionStorage.removeItem('logoutState');
        localStorage.removeItem('userEmail');
      }
    } catch (error) {
      console.error('Error during logout:', error);
      // Fallback direct signout if removeUser fails
      signOutRedirect();
    }
  }, [auth, signOutRedirect, usingFallbackAuth]);

  // Memoize dashboard close handler
  const handleDashboardClose = useCallback(() => {
    console.log("handleDashboardClose called");
    setShowDashboard(false);
    // Clear edit item id from local storage
    localStorage.removeItem('editItemId');
    // Ensure editItemId is null
    setEditItemId(null);
  }, []);

  // Memoize item edit handler
  const handleItemEdit = useCallback((itemId: number) => {
    console.log(`handleItemEdit called with itemId: ${itemId}`);
    setShowDashboard(true);
    setEditItemId(itemId);
    // Store edit item id in local storage for persistence across reloads
    localStorage.setItem('editItemId', String(itemId));
  }, []);

  // Handle login action
  const handleLogin = useCallback(() => {
    try {
      console.log("Starting sign-in redirect with the following configuration:");
      console.log("- Redirect URI:", auth.settings.redirect_uri);
      console.log("- Authority:", auth.settings.authority);
      console.log("- Client ID:", auth.settings.client_id);
      
      auth.signinRedirect()
        .then(() => {
          console.log("Sign-in redirect initiated successfully");
        })
        .catch(error => {
          console.error('Error during sign-in redirect:', error);
          // Display user-friendly error in the console
          console.log("Authentication failed. Please check AWS Cognito configuration in the AWS Console:");
          console.log("1. Verify that the App Client has the correct callback URLs");
          console.log("2. Make sure the domains are allowed in the App Client settings");
          console.log(`3. Ensure the current domain (${window.location.origin}) is whitelisted`);
        });
    } catch (error) {
      console.error("Exception during login initialization:", error);
    }
  }, [auth]);

  // Handle retry for auth errors
  const handleRetry = useCallback(() => {
    setAuthRetryCount(prev => prev + 1);
    
    // Clear URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    
    if (errorParam) {
      // Remove error params from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
    
    // Try to authenticate again
    auth.signinRedirect().catch(error => {
      console.error('Error during retry sign-in:', error);
    });
  }, [auth]);

  // Memoize the context value to prevent unnecessary rerenders
  const contextValue = useMemo(() => ({
    showDashboard,
    setShowDashboard,
    isAuthenticated: auth.isAuthenticated || usingFallbackAuth,
    handleLogout,
    apiStatus,
  }), [
    showDashboard, 
    auth.isAuthenticated,
    usingFallbackAuth,
    handleLogout,
    apiStatus,
  ]);

  // Setup database and authentication
  useEffect(() => {
    // Initialize the database
    const setupDB = async () => {
      try {
        // Initialize the database
        await initDB();
        console.log("Database initialized");
        
        try {
          // Get all items from the database
          const items = await getAllItems();
          console.log(`Loaded ${items.length} items from database`);
        } catch (dbError) {
          console.error("Error getting items:", dbError);
          setApiStatus({
            connected: false,
            message: "Database connected but there was an error fetching items."
          });
        }
      } catch (error) {
        console.error("Database initialization error:", error);
        setApiStatus({
          connected: false,
          message: "Unable to connect to the database. Using mock data."
        });
      }
    };

    setupDB();
    
    // Check for auth errors and try to recover
    if (auth.error) {
      console.error("Auth error detected:", auth.error);
      
      // Try to recover from auth errors
      const canRecover = false; // Remove the manualAuth import to fix build error
      
      if (canRecover) {
        setUsingFallbackAuth(true);
        console.log("Recovered from auth error using fallback auth");
        
        // Skip the event handlers that are causing type errors
        return;
      }
    }
    
    // If fallback auth is being used, check if it's still authenticated
    if (usingFallbackAuth) {
      const isAuthenticated = false; // Remove the manualAuth import to fix build error
      console.log("Using fallback auth, authenticated:", isAuthenticated);
      
      if (!isAuthenticated) {
        setUsingFallbackAuth(false);
      } else {
        // Get user info for display
        const userInfo = null; // Remove the manualAuth import to fix build error
        console.log("User info from fallback auth:", userInfo);
      }
    }
    
    // Set a timeout to hide the API status notification
    const timer = setTimeout(() => {
      setShowApiNotification(false);
    }, 5000);
    
    return () => {
      clearTimeout(timer);
    };
  }, [auth.error, auth.isAuthenticated, usingFallbackAuth]);
  
  // Restore edit item ID from local storage if available
  useEffect(() => {
    if (showDashboard && !editItemId) {
      const storedEditItemId = localStorage.getItem('editItemId');
      if (storedEditItemId) {
        const id = parseInt(storedEditItemId);
        setEditItemId(id);
      }
    }
  }, [showDashboard, editItemId]);
  
  // Check API connectivity periodically
  useEffect(() => {
    // Initial check
    const checkConnection = async () => {
      try {
        const status = await checkApiConnectivity();
        setApiStatus({
          connected: true,
          message: `Connected to API`
        });
      } catch (error) {
        console.error("API connectivity check failed:", error);
        setApiStatus({
          connected: false,
          message: "API connectivity check failed. Using cached data."
        });
      }
    };
    
    checkConnection();
    
    // Set up interval to check periodically
    const interval = setInterval(checkConnection, 60000); // Check every minute
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Render loading state if auth is not ready
  if (auth.isLoading) {
    return <AuthLoading />;
  }

  // Use fallback authentication if needed
  if (!auth.isAuthenticated && !auth.isLoading) {
    // Try to recover using manual auth
    const isAuthenticated = false; // Remove the manualAuth import to fix build error
    
    if (isAuthenticated && !usingFallbackAuth) {
      setUsingFallbackAuth(true);
    }
    
    // Handle auth errors
    if (auth.error && !usingFallbackAuth) {
      console.error("Auth error:", auth.error);
      
      let errorMessage = "Unknown authentication error";
      
      // Check for URL error parameters
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');
      
      if (errorParam) {
        errorMessage = `${errorParam}: ${errorDescription || 'No description provided'}`;
      } else if (auth.error.message) {
        errorMessage = auth.error.message;
      }
      
      return <AuthError errorMessage={errorMessage} onRetry={handleRetry} />;
    }

    if (!auth.isAuthenticated && !usingFallbackAuth) {
      return <LoginScreen onLogin={handleLogin} />;
    }
  }

  return (
    <ErrorBoundary fallback={<NetworkErrorFallback />}>
      <DashboardContext.Provider value={contextValue}>
        <div className="min-h-screen relative">
          {/* API Status Notification */}
          {showApiNotification && <ApiNotification apiStatus={apiStatus} />}
          
          {/* Main Content */}
          <div className="min-h-screen">
            {showDashboard ? (
              <Dashbroad 
                onClose={handleDashboardClose} 
                editItemId={editItemId}
              />
            ) : (
              <DashbroadListing onItemEdit={handleItemEdit} />
            )}
          </div>
        </div>
      </DashboardContext.Provider>
    </ErrorBoundary>
  );
};