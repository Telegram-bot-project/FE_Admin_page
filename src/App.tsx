import React, { useState, useEffect } from "react";
import { Dashbroad } from "./screens/Dashbroad/Dashbroad";
import { DashbroadListing } from "./screens/DashbroadListing/DashbroadListing";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./components/ui/card";
import { initDB, getAllItems, checkApiConnectivity } from "./lib/db";
import { DatabaseIcon, LogOut } from "lucide-react";

// Create a context to manage the dashboard state
export const DashboardContext = React.createContext<{
  showDashboard: boolean;
  setShowDashboard: React.Dispatch<React.SetStateAction<boolean>>;
  isAuthenticated: boolean;
  handleLogout: () => void;
}>({
  showDashboard: false,
  setShowDashboard: () => {},
  isAuthenticated: false,
  handleLogout: () => {},
});

export const App = (): JSX.Element => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [apiStatus, setApiStatus] = useState<{ connected: boolean; message: string }>({
    connected: true,
    message: ''
  });
  const [showApiNotification, setShowApiNotification] = useState(true);
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call with a short delay
    setTimeout(() => {
      // Basic authentication check
      // In a real app, you would validate against a backend API
      if (username === "admin" && password === "password") {
        setIsAuthenticated(true);
        setError("");
      } else {
        setError("Invalid username or password");
      }
      setIsLoading(false);
    }, 800);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setShowDashboard(false);
    setUsername("");
    setPassword("");
  };

  // Initialize database and check API connection on app start
  useEffect(() => {
    const setupDB = async () => {
      try {
        await initDB();
        console.log("Database initialized successfully");
        
        // Test API connection
        try {
          const items = await getAllItems();
          console.log("API response data:", items);
          
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
          console.error("API connection error:", error);
          setApiStatus({ 
            connected: false, 
            message: `Error connecting to API: ${error instanceof Error ? error.message : 'Unknown error'}` 
          });
        }
      } catch (error) {
        console.error("Error initializing database:", error);
        setApiStatus({ 
          connected: false, 
          message: `Error initializing database: ${error instanceof Error ? error.message : 'Unknown error'}` 
        });
      }
    };
    
    setupDB();
  }, []);

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

  // Add debug logging for showDashboard state changes
  useEffect(() => {
    console.log("showDashboard state changed to:", showDashboard);
  }, [showDashboard]);

  // Handle dashboard close
  const handleDashboardClose = () => {
    console.log("handleDashboardClose called");
    setShowDashboard(false);
    // Clear the edit item ID
    setEditItemId(null);
    // Clear any leftover edit data in localStorage
    localStorage.removeItem('editItem');
    localStorage.removeItem('editItemId');
  };

  // Handle edit item request from the listing
  const handleItemEdit = (itemId: number) => {
    console.log("handleItemEdit called with itemId:", itemId);
    setEditItemId(itemId);
    setShowDashboard(true);
  };

  // Inside the App component, before return statement, add:
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const status = await checkApiConnectivity();
        setApiStatus({
          connected: status.connected,
          message: status.message || ''
        });
        
        if (!status.connected) {
          console.error('API connection failed:', status.message);
        }
      } catch (error) {
        console.error('Error checking API connection:', error);
        setApiStatus({
          connected: false,
          message: error instanceof Error ? error.message : 'Unknown error checking API connection'
        });
      }
    };

    checkConnection();
  }, []);

  if (!isAuthenticated) {
    return (
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
            <p className="text-white/60 text-center text-sm">Sign in to access your dashboard</p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70 block">Username</label>
                  <Input
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-white/5 border-white/10 placeholder:text-white/30 text-white h-11 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500/40"
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70 flex justify-between">
                    <span>Password</span>
                    <a href="#" className="text-indigo-400 hover:text-indigo-300 text-xs">Forgot password?</a>
                  </label>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/5 border-white/10 placeholder:text-white/30 text-white h-11 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500/40"
                    disabled={isLoading}
                  />
                </div>
                
                {error && (
                  <div className="bg-red-500/20 border border-red-500/30 text-red-200 text-sm rounded p-3">
                    {error}
                  </div>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-11 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:opacity-90 transition-opacity"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing In...
                  </div>
                ) : "Sign In"}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="text-center text-white/50 text-sm border-t border-white/10 mt-4 pt-4">
            <div className="mx-auto">
              Use <span className="text-white font-medium">admin</span> / <span className="text-white font-medium">password</span> to log in
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <DashboardContext.Provider value={{ showDashboard, setShowDashboard, isAuthenticated, handleLogout }}>
      <div className="min-h-screen relative">
        {/* API Status Notification */}
        {showApiNotification && (
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
        )}
        
        {/* Logout Button - Always visible */}
        <button 
          onClick={handleLogout}
          className="fixed top-4 right-4 z-40 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white px-3 py-2 rounded-md flex items-center text-sm transition-colors shadow-md border border-white/10"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </button>
      
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
  );
};

// Update the NetworkErrorFallback component to show more detailed error information
const NetworkErrorFallback = () => (
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