import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useAuth } from "react-oidc-context";
import { Dashbroad } from "./screens/Dashbroad/Dashbroad";
import { DashbroadListing } from "./screens/DashbroadListing/DashbroadListing";
import { Button } from "./components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./components/ui/card";
import { initDB, getAllItems, checkApiConnectivity } from "./lib/db";
import { DatabaseIcon, LogOut } from "lucide-react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { manualAuth, authEventHandlers } from "./lib/authUtils";

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
      if (hostname.includes('cloudfront.net') || process.env.NODE_ENV === 'production') {
        return "https://d84l1y8p4kdic.cloudfront.net";
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
        manualAuth.logout();
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
    // Clear the edit item ID
    setEditItemId(null);
    // Clear any leftover edit data in localStorage
    localStorage.removeItem('editItem');
    localStorage.removeItem('editItemId');
  }, []);

  // Memoize item edit handler
  const handleItemEdit = useCallback((itemId: number) => {
    console.log("handleItemEdit called with itemId:", itemId);
    setEditItemId(itemId);
    setShowDashboard(true);
  }, []);

  // Memoize the login handler
  const handleLogin = useCallback(() => {
    auth.signinRedirect();
  }, [auth]);

  // Enhanced retry handler that tries alternative login method on repeated failures
  const handleRetry = useCallback(() => {
    setAuthRetryCount(prev => prev + 1);
    
    // Show more descriptive error message in console for debugging
    console.log(`Auth retry attempt ${authRetryCount + 1}`);
    
    // Check for redirect_mismatch error in URL
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    
    if (errorParam === 'redirect_mismatch') {
      console.error('Redirect URI mismatch detected. This means the redirect_uri in your code does not match what is configured in AWS Cognito.');
      
      // Try manual authentication as fallback
      setUsingFallbackAuth(true);
      manualAuth.login();
      return;
    }
    
    // If we've tried OIDC more than twice, switch to manual auth
    if (authRetryCount >= 2) {
      console.log("Switching to manual authentication after repeated failures");
      setUsingFallbackAuth(true);
      manualAuth.login();
    } else if (authRetryCount >= 3) {
      // If even manual auth isn't working, do a full page reload
      window.location.reload();
    } else {
      // Just retry the auth flow
      auth.signinRedirect();
    }
  }, [auth, authRetryCount]);

  // Memoize context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo(() => ({
    showDashboard,
    setShowDashboard,
    isAuthenticated: auth.isAuthenticated,
    handleLogout,
    apiStatus
  }), [showDashboard, auth.isAuthenticated, handleLogout, apiStatus]);

  // Initialize database and check API connection on app start
  useEffect(() => {
    let mounted = true;
    
    const setupDB = async () => {
      try {
        await initDB();
        console.log("Database initialized successfully");
        
        // Test API connection
        try {
          const items = await getAllItems();
          console.log("API response data:", items);
          
          if (!mounted) return;
          
          if (Array.isArray(items)) {
            setApiStatus({ 
              connected: true, 
              message: `Connected to API successfully! Found ${items.length} items.` 
            });
            console.log("API connection successful");
          } else {
            setApiStatus({ 
              connected: false, 
              message: "Connected to API but received unexpected data format." 
            });
            console.error("Unexpected data format:", items);
          }
        } catch (error) {
          if (!mounted) return;
          
          console.error("API connection error:", error);
          setApiStatus({ 
            connected: false, 
            message: `Error connecting to API: ${error instanceof Error ? error.message : 'Unknown error'}` 
          });
        }
      } catch (error) {
        if (!mounted) return;
        
        console.error("Error initializing database:", error);
        setApiStatus({ 
          connected: false, 
          message: `Error initializing database: ${error instanceof Error ? error.message : 'Unknown error'}` 
        });
      }
    };
    
    setupDB();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Listen for auth errors that might occur after initial login
  useEffect(() => {
    if (auth.error) {
      console.error("Auth error detected in listener:", auth.error);
      
      // Try to recover from the error
      const canRecover = manualAuth.recoverFromError(auth.error);
      
      if (!canRecover && authRetryCount < 3) {
        // If recovery isn't possible, try the fallback authentication
        setUsingFallbackAuth(true);
        setAuthRetryCount(prev => prev + 1);
        manualAuth.login();
      }
    }
  }, [auth.error, authRetryCount]);

  // Check for fallback authentication success
  useEffect(() => {
    // If we're using fallback auth, check if the user is authenticated
    if (usingFallbackAuth) {
      const isAuthenticated = manualAuth.isAuthenticated();
      console.log("Fallback auth status:", isAuthenticated);
      
      // If authenticated, run onLoginSuccess handler
      if (isAuthenticated) {
        // Get user info from session storage
        const userInfo = manualAuth.getUserInfo();
        console.log("Fallback auth user info:", userInfo);
        
        // Store user email in localStorage for display in the header
        if (userInfo && userInfo.email) {
          localStorage.setItem('userEmail', userInfo.email);
        }
      }
    }
  }, [usingFallbackAuth]);

  // Register auth event handlers
  useEffect(() => {
    if (auth.events) {
      auth.events.addUserLoaded((user) => {
        authEventHandlers.onLoginSuccess(user);
        
        // Store user email in localStorage for display in the header
        if (user && user.profile && user.profile.email) {
          localStorage.setItem('userEmail', user.profile.email);
        }
      });
      
      auth.events.addSilentRenewError((error) => {
        authEventHandlers.onSilentRenewError(error);
      });
    }
    
    return () => {
      // Cleanup event listeners
      if (auth.events) {
        auth.events.removeUserLoaded(() => {});
        auth.events.removeSilentRenewError(() => {});
      }
    };
  }, [auth.events]);

  // Set a timer to hide the API notification after data loads
  useEffect(() => {
    // Only start the timer once we have a definitive API status
    if (apiStatus.connected !== undefined) {
      // Show the notification
      setShowApiNotification(true);
      
      // Set a timeout to hide it after 3 seconds
      const timer = setTimeout(() => {
        setShowApiNotification(false);
      }, 3000); // 3 seconds
      
      // Clean up the timer when component unmounts or status changes
      return () => clearTimeout(timer);
    }
  }, [apiStatus]);

  // Check for edit mode when the dashboard is about to show
  useEffect(() => {
    if (showDashboard) {
      // Get the item ID from localStorage
      const storedEditItemId = localStorage.getItem('editItemId');
      if (storedEditItemId) {
        const id = parseInt(storedEditItemId);
        console.log("Setting edit item ID from localStorage:", id);
        setEditItemId(id);
      } else {
        setEditItemId(null);
      }
    }
  }, [showDashboard]);

  // Check API connectivity on mount
  useEffect(() => {
    let mounted = true;
    
    const checkConnection = async () => {
      try {
        const status = await checkApiConnectivity();
        
        if (!mounted) return;
        
        setApiStatus({
          connected: status.connected,
          message: status.message || ''
        });
        
        if (!status.connected) {
          console.error('API connection failed:', status.message);
        }
      } catch (error) {
        if (!mounted) return;
        
        console.error('Error checking API connection:', error);
        setApiStatus({
          connected: false,
          message: error instanceof Error ? error.message : 'Unknown error checking API connection'
        });
      }
    };

    checkConnection();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Conditional rendering based on authentication state with enhanced error handling
  if (auth.isLoading) {
    return <AuthLoading />;
  }

  // If we're using fallback auth, use our manual check
  if (usingFallbackAuth) {
    const isAuthenticated = manualAuth.isAuthenticated();

  if (!isAuthenticated) {
      return <LoginScreen onLogin={() => manualAuth.login()} />;
    }
  } else {
    // Enhanced error handling with detailed error information
    if (auth.error) {
      console.error("Auth error details:", {
        name: auth.error.name,
        message: auth.error.message,
        stack: auth.error.stack,
        url: window.location.href // Log current URL for debugging redirect issues
      });
      
      // Check for specific error types and provide better user messages
      let errorMessage = auth.error.message;
      
      // Check for redirect_mismatch error in URL
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get('error');
      
      if (errorParam === 'redirect_mismatch') {
        errorMessage = "Authentication configuration error: The application's redirect URI doesn't match what is configured in AWS Cognito.";
      } else if (errorMessage.includes("Token expired")) {
        errorMessage = "Your session has expired. Please log in again.";
      } else if (errorMessage.includes("Network Error") || errorMessage.includes("Failed to fetch")) {
        errorMessage = "Network connection issue. Please check your internet connection and try again.";
      }
      
      return <AuthError errorMessage={errorMessage} onRetry={handleRetry} />;
    }

    if (!auth.isAuthenticated) {
      return <LoginScreen onLogin={handleLogin} />;
    }
  }

  return (
    <ErrorBoundary fallback={<NetworkErrorFallback />}>
      <DashboardContext.Provider value={contextValue}>
      <div className="min-h-screen relative">
        {/* API Status Notification */}
          {showApiNotification && <ApiNotification apiStatus={apiStatus} />}
          
          {/* User Info & Logout Button - Removed as it's now in the sidebar */}
      
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

// Update the NetworkErrorFallback component to show more detailed error information
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