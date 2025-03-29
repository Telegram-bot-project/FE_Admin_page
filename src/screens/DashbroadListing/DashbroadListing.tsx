import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { CircleCheck, ChevronsLeft, ChevronsRight, RefreshCw, Loader2, Save, AlertTriangle, X, Eye, Info } from "lucide-react";
import { FilterSection } from "./sections/FilterSection/FilterSection";
import { OrderListSection } from "./sections/OrderListSection/OrderListSection";
import { KnowledgeItem, getAllItems, createItem, updateItem, deleteItem, createCategory, getCategoriesWithDetails, VALID_CATEGORIES } from "../../lib/db";
import { DashboardContext } from "../../App";
import { useContext } from "react";
import { ErrorDisplay } from "../../components/ErrorDisplay";
import { useDatabase } from "../../lib/store";
import { Button } from "../../components/ui/button";

interface DashbroadListingProps {
  onItemEdit: (itemId: number) => void
}

// API Status banner with improved styling and retry action
const ApiStatusBanner = memo(({ 
  status, 
  onRetry 
}: { 
  status: { connected: boolean; message?: string }, 
  onRetry: () => void 
}) => {
  if (status.connected) return null;
  
  return (
    <ErrorDisplay
      message={status.message || "API connection issue. Updates may not be saved."}
      type="api"
      onRetry={onRetry}
      inline
    />
  );
});

// Memoized loading component
const LoadingSpinner = memo(() => (
  <div className="flex justify-center items-center h-64">
    <div className="flex flex-col items-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-gray-200 text-lg">Loading items...</p>
    </div>
  </div>
));

// Memoized pending changes notification
const PendingChangesNotification = memo(({ 
  pendingCreations, 
  pendingUpdates, 
  pendingDeletions 
}: { 
  pendingCreations: any[], 
  pendingUpdates: any[], 
  pendingDeletions: Set<number> 
}) => (
  <div className="bg-amber-900/30 p-4 border-b border-amber-500/30">
    <div className="container mx-auto">
      <div className="flex items-center text-amber-200">
        <div className="mr-4">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </span>
        </div>
        <div>
          <h3 className="font-medium">Pending changes</h3>
          <p className="text-amber-300/80 text-sm">
            {pendingCreations.length > 0 && `${pendingCreations.length} item(s) to create. `}
            {pendingUpdates.length > 0 && `${pendingUpdates.length} item(s) to update. `}
            {pendingDeletions.size > 0 && `${pendingDeletions.size} item(s) to delete.`}
          </p>
        </div>
      </div>
    </div>
  </div>
));

// Modal for viewing item details
const ItemViewModal = ({ item, onClose }: { item: KnowledgeItem, onClose: () => void }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  // Determine item type for specialized display
  const isFAQ = item.type === "FAQ";
  const isSOS = item.type === "SOS assistants";
  
  // Extract phone number for SOS items for quick reference
  const phoneNumber = isSOS && item.description ? 
    item.description.match(/Phone number:[^\n]*/)?.[0] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ease-in-out"
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div className="relative max-w-3xl w-full max-h-[85vh] overflow-auto bg-gradient-to-b from-[#252136] to-[#1c192a] border border-white/10 rounded-xl shadow-2xl transition-all duration-300 ease-in-out m-4">
        <div className="sticky top-0 z-10 backdrop-blur-md bg-[#252136]/80 border-b border-white/10 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Info className="w-5 h-5 mr-2 text-indigo-400" />
            {isFAQ ? "FAQ Details" : 
             isSOS ? "SOS Contact Details" :
             "Item Details"}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            rounded="full"
            onClick={onClose}
            className="text-white/60 hover:text-white hover:bg-white/10"
            aria-label="Close details"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="p-6">
          {/* Image section */}
          {item.image && (
            <div className="mb-6 bg-black/30 border border-white/10 rounded-lg p-4 overflow-auto">
              <img 
                src={item.image || '/img/placeholder.png'} 
                alt={item.name}
                className="max-w-full h-auto rounded-md object-cover mb-4 max-h-[200px] w-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/img/placeholder.png';
                }}
              />
            </div>
          )}

          {/* Item details */}
          <div className="space-y-4">
            {/* Primary field (Name/Question/Support Type) */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <h3 className="text-white/50 text-sm font-medium mb-1">
                {isFAQ ? "Question" : 
                 isSOS ? "Support Type" : 
                 "Name"}
              </h3>
              <p className="text-white text-lg font-medium">{item.name || 'Untitled'}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h3 className="text-white/50 text-sm font-medium mb-1">Category</h3>
                <div>
                  <span 
                    className={`px-3 py-1 rounded-full text-sm font-medium inline-flex items-center ${
                      item.type === "Event" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                      item.type === "Food & Beverage" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                      item.type === "Tips" ? "bg-red-500/20 text-red-300 border border-red-500/30" :
                      item.type === "Contact" ? "bg-pink-500/20 text-pink-300 border border-pink-500/30" :
                      item.type === "FAQ" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" :
                      item.type === "SOS assistants" ? "bg-red-500/20 text-red-300 border border-red-500/30" :
                      "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                    }`}
                  >
                    {item.type || 'Custom'}
                  </span>
                </div>
              </div>
              
              {/* Timestamps */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h3 className="text-white/50 text-sm font-medium mb-1">Created</h3>
                <p className="text-white">{formatDate(item.created_at)}</p>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h3 className="text-white/50 text-sm font-medium mb-1">Last Updated</h3>
                <p className="text-white">{formatDate(item.updated_at)}</p>
              </div>
              
              {/* Time & Date - Only show for non-FAQ items */}
              {!isFAQ && item.date && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <h3 className="text-white/50 text-sm font-medium mb-1">Date</h3>
                  <p className="text-white">{item.date}</p>
                </div>
              )}
              
              {!isFAQ && item.time && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <h3 className="text-white/50 text-sm font-medium mb-1">Time</h3>
                  <p className="text-white">{item.time}</p>
                </div>
              )}
              
              {/* Price - Only show for items with price and non-FAQ */}
              {!isFAQ && item.price && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <h3 className="text-white/50 text-sm font-medium mb-1">Price</h3>
                  <p className="text-white">{item.price}</p>
                </div>
              )}
              
              {/* Address - Show for non-FAQ or SOS items */}
              {(item.address && (!isFAQ || isSOS)) && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 md:col-span-2">
                  <h3 className="text-white/50 text-sm font-medium mb-1">Address</h3>
                  <p className="text-white">{item.address}</p>
                </div>
              )}
              
              {/* Description/Answer - All item types */}
              {item.description && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-4 md:col-span-2">
                  <h3 className="text-white/50 text-sm font-medium mb-1">
                    {isFAQ ? "Answer" : "Description"}
                  </h3>
                  <p className="text-white whitespace-pre-wrap">{item.description}</p>
                </div>
              )}

              {/* Phone number extraction for SOS assistants for quick reference */}
              {isSOS && phoneNumber && (
                <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-4 md:col-span-2">
                  <h3 className="text-red-300 text-sm font-medium mb-1">Quick Contact</h3>
                  <p className="text-white font-medium">
                    {phoneNumber}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

ItemViewModal.displayName = 'ItemViewModal';

export const DashbroadListing = memo(({ onItemEdit }: DashbroadListingProps): JSX.Element => {
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [filteredItems, setFilteredItems] = useState<KnowledgeItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [groupByCategory, setGroupByCategory] = useState<string | null>(null)
  const [loadingOperation, setLoadingOperation] = useState<boolean>(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [selectedItemForView, setSelectedItemForView] = useState<KnowledgeItem | null>(null);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState<boolean>(false);
  
  // Access database state from Zustand store
  const { 
    pendingCreations, 
    pendingUpdates, 
    pendingDeletions,
    clearPendingChanges, 
    hasPendingChanges,
    addPendingDeletion,
    removePendingDeletion,
    removePendingUpdate,
    removePendingCreation,
    handleDatabaseUpdated
  } = useDatabase()

  // Add context directly here
  const { setShowDashboard, apiStatus } = useContext(DashboardContext)

  // Check API connectivity on component mount and when requested
  const checkApiConnection = useCallback(async () => {
    if (!apiStatus || !apiStatus.connected) {
      try {
        // Here you could add code to check API connectivity
        // For now let's just refresh data
        await loadItems(true);
      } catch (error) {
        console.error("Error checking API connection:", error);
      }
    }
  }, [apiStatus]);

  // Memoize load items function to avoid recreating on each render
  const loadItems = useCallback(async (bypassCache = false) => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getAllItems(undefined, bypassCache)
      
      // Ensure we have valid data
      if (!data || !Array.isArray(data)) {
        console.error("Invalid data format received:", data)
        setError("Received invalid data format from the server.")
        setItems([])
        setFilteredItems([])
        return
      }
      
      // Log success and update state
      console.log(`Successfully loaded ${data.length} items`)
      setItems(data as unknown as KnowledgeItem[])
      setFilteredItems(data as unknown as KnowledgeItem[])
      setLastUpdated(new Date())
    } catch (error) {
      console.error("Error fetching items:", error)
      setError(`Failed to load items: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setItems([])
      setFilteredItems([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Memoize update database function
  const handleUpdateDatabase = useCallback(async () => {
    if (!hasPendingChanges()) {
      return
    }
    
    try {
      setLoadingOperation(true)
      
      // Process all changes one at a time for better error handling
      
      // First, handle deletions
      for (const itemId of pendingDeletions) {
        try {
          await deleteItem(itemId);
          console.log(`Deleted item with ID: ${itemId}`);
          // Remove from pending deletions upon success
          removePendingDeletion(itemId);
        } catch (error) {
          console.error(`Error deleting item ${itemId}:`, error);
          throw new Error(`Failed to delete item ${itemId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Then handle updates
      for (const item of pendingUpdates) {
        try {
          // First, check if the item uses a custom category and ensure it exists
          if (item.category && !VALID_CATEGORIES.includes(item.category)) {
            console.log(`Item ${item.id} uses custom category: ${item.category}`);
            
            try {
              // Attempt to create the category first
              const categoryExists = await getCategoriesWithDetails()
                .then(cats => cats.some(cat => cat.name === item.category))
                .catch(() => false);
              
              if (!categoryExists) {
                // Create the category in the database first
                await createCategory({
                  name: item.category,
                  description: `Custom category created for item: ${item.name}`
                });
                console.log(`Created category "${item.category}" before updating item ${item.id}`);
              }
            } catch (categoryError) {
              console.warn(`Failed to create/check custom category: ${categoryError}. Will try updating anyway.`);
            }
          }
          
          await updateItem(item.id, item);
          console.log(`Updated item with ID: ${item.id}`);
          // Remove from pending updates upon success
          removePendingUpdate(item.id);
        } catch (error) {
          console.error(`Error updating item ${item.id}:`, error);
          throw new Error(`Failed to update item ${item.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Then handle creations
      for (const item of pendingCreations) {
        try {
          // First, check if the item uses a custom category and ensure it exists
          if (item.category && !VALID_CATEGORIES.includes(item.category)) {
            console.log(`New item uses custom category: ${item.category}`);
            
            try {
              // Attempt to create the category first
              const categoryExists = await getCategoriesWithDetails()
                .then(cats => cats.some(cat => cat.name === item.category))
                .catch(() => false);
              
              if (!categoryExists) {
                // Create the category in the database first
                await createCategory({
                  name: item.category,
                  description: `Custom category created for item: ${item.name}`
                });
                console.log(`Created category "${item.category}" before creating new item`);
              }
            } catch (categoryError) {
              console.warn(`Failed to create/check custom category: ${categoryError}. Will try creating item anyway.`);
            }
          }
          
          await createItem(item);
          console.log('Created new item:', item);
          // Remove from pending creations
          removePendingCreation(0); // Remove the first one since we're processing in sequence
        } catch (error) {
          console.error(`Error creating item:`, error);
          
          // Check for specific error messages related to categories
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          if (errorMsg.includes('category') || errorMsg.includes('400')) {
            throw new Error(`Failed to create item with category "${item.category}". Please make sure the category exists in the database or try using a default category.`);
          } else {
            throw new Error(`Failed to create item: ${errorMsg}`);
          }
        }
      }
      
      // Reload items to reflect changes
      await loadItems(true) // bypass cache
      
      alert("Database updated successfully!");
      handleDatabaseUpdated();
    } catch (error) {
      console.error("Error updating database:", error)
      
      // Format user-friendly error message based on error type
      let errorMessage = "Failed to update database: ";
      if (error instanceof Error) {
        // Check for common error patterns and provide more helpful messages
        if (error.message.includes('400') && error.message.includes('category')) {
          errorMessage += "There was an issue with a custom category. Try using one of the default categories instead.";
        } else if (error.message.includes('400')) {
          errorMessage += "Bad request error (400). Check that your data is valid.";
        } else if (error.message.includes('401') || error.message.includes('403')) {
          errorMessage += "You don't have permission to make these changes.";
        } else if (error.message.includes('404')) {
          errorMessage += "Resource not found. This item might have been deleted already.";
        } else if (error.message.includes('429')) {
          errorMessage += "Too many requests. Please try again after a few minutes.";
        } else if (error.message.includes('500')) {
          errorMessage += "Server error. Please try again later.";
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += "Unknown error occurred.";
      }
      
      alert(errorMessage);
    } finally {
      setLoadingOperation(false)
    }
  }, [
    hasPendingChanges, 
    pendingDeletions, 
    pendingUpdates, 
    pendingCreations, 
    removePendingCreation,
    removePendingUpdate,
    removePendingDeletion,
    loadItems,
    handleDatabaseUpdated
  ])

  // Memoize filter apply handler
  const handleFilterApply = useCallback((filtered: KnowledgeItem[]) => {
    setFilteredItems(filtered)
  }, [])

  // Memoize group by category handler
  const handleGroupByCategory = useCallback((category: string | null) => {
    setGroupByCategory(category)
  }, [])

  // Memoize create new handler
  const handleCreateNew = useCallback(() => {
    console.log("DashbroadListing: handleCreateNew called")
    setShowDashboard(true)
  }, [setShowDashboard])

  // Handle view item details
  const handleViewItem = useCallback((item: KnowledgeItem) => {
    setSelectedItemForView(item);
  }, []);

  // Handle delete item
  const handleDeleteItem = useCallback((itemId: number) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        // Add to pending deletions in the Zustand store
        addPendingDeletion(itemId);
        
        // Remove from UI immediately
        setItems(prev => prev.filter(item => item.id !== itemId));
        setFilteredItems(prev => prev.filter(item => item.id !== itemId));
        
        // Show notification to the user
        console.log("Item marked for deletion. Click Update Database to apply changes.");
      } catch (error) {
        console.error("Error marking item for deletion:", error);
        alert(`Failed to mark item for deletion: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }, [addPendingDeletion]);

  // Load items on component mount
  useEffect(() => {
    loadItems()
    // Set up refresh interval (every 5 minutes)
    const refreshInterval = setInterval(() => {
      loadItems(true) // Bypass cache for periodic refresh
    }, 5 * 60 * 1000)
    
    return () => clearInterval(refreshInterval)
  }, [loadItems])
  
  // Force refresh handler
  const handleForceRefresh = useCallback(() => {
    loadItems(true) // bypass cache
  }, [loadItems])

  // Handle sidebar toggle
  const handleSidebarToggle = useCallback((minimized: boolean) => {
    setIsSidebarMinimized(minimized);
  }, []);

  // Memoized render functions
  const renderMainContent = useMemo(() => {
    if (error) {
      return (
        <ErrorDisplay
          message={error}
          description="There was a problem loading the data. Please try again."
          type="error"
          onRetry={() => loadItems(true)}
          centered
        />
      );
    }
    
    if (isLoading) {
      return <LoadingSpinner />
    }
    
    return (
      <OrderListSection 
        items={filteredItems}
        groupByCategory={groupByCategory}
        onItemEdit={onItemEdit}
        onDeleteItem={handleDeleteItem}
        onViewItem={handleViewItem}
      />
    )
  }, [error, isLoading, filteredItems, groupByCategory, onItemEdit, loadItems, handleDeleteItem, handleViewItem])

  // Format last updated time
  const formattedLastUpdated = useMemo(() => {
    return lastUpdated.toLocaleTimeString();
  }, [lastUpdated]);

  // Memoize hasPendingChangesValue to avoid unnecessary re-renders
  const hasPendingChangesValue = useMemo(() => hasPendingChanges(), [
    pendingCreations.length,
    pendingUpdates.length,
    pendingDeletions.size
  ]);

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#2b2641] to-[#1a1625] overflow-hidden">
      {/* Dashboard Header Bar */}
      <div className="absolute top-0 left-0 right-0 bg-black/40 backdrop-blur-sm border-b border-white/10 py-3 px-6 flex justify-between items-center z-10">
        <div className="flex items-center">
          <h1 className="text-lg font-bold text-white mr-4">TeleBot Dashboard</h1>
          <div className="text-white/50 text-xs flex items-center">
            Last updated: {formattedLastUpdated}
            <button 
              onClick={handleForceRefresh}
              className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors"
              title="Refresh data"
              disabled={isLoading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-white/30' : 'text-white/50'}`} />
            </button>
          </div>
        </div>
        
        {hasPendingChangesValue && (
          <Button 
            onClick={handleUpdateDatabase} 
            disabled={loadingOperation}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 border-none shadow-md text-white font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] px-4 py-1.5 h-9 rounded-md"
            aria-label="Save pending changes to database"
          >
            {loadingOperation ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                <span>Update Database</span>
                <span className="bg-white/20 text-white text-xs font-semibold rounded-full px-1.5 py-px ml-2 min-w-[1.25rem] text-center">
                  {pendingCreations.length + pendingUpdates.length + pendingDeletions.size}
                </span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Main content with adjusted padding for the top banner */}
      <div className="flex w-full h-full pt-14">
        {/* Sidebar - adjust width based on minimized state */}
        <div className={`${isSidebarMinimized ? 'w-16' : 'w-[260px]'} h-full flex-shrink-0 border-r border-white/10 transition-all duration-300 ease-in-out`}>
          <FilterSection 
            items={items}
            onFilterApply={handleFilterApply}
            onGroupByCategory={handleGroupByCategory}
            onCreateNew={handleCreateNew}
            onSidebarToggle={handleSidebarToggle}
          />
        </div>
        
        {/* Main Content - will expand when sidebar is minimized */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* API Status */}
          <ApiStatusBanner status={apiStatus || { connected: true }} onRetry={checkApiConnection} />
          
          {/* Pending Changes Notification */}
          {hasPendingChangesValue && (
            <PendingChangesNotification 
              pendingCreations={pendingCreations}
              pendingUpdates={pendingUpdates}
              pendingDeletions={pendingDeletions}
            />
          )}
          
          <div className="flex-1 overflow-auto p-6">
            {renderMainContent}
          </div>
        </div>
      </div>

      {/* Item View Modal */}
      {selectedItemForView && (
        <ItemViewModal 
          item={selectedItemForView} 
          onClose={() => setSelectedItemForView(null)} 
        />
      )}
    </div>
  )
}) 