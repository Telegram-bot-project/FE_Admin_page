import { OrderListSection } from "./sections/OrderListSection/OrderListSection"
import { FilterSection } from "./sections/FilterSection/FilterSection"
import { useEffect, useState, useContext } from "react"
import { type KnowledgeItem, createItem, fetchItems, updateItem, deleteItem } from "../../lib/db"
import { useDatabase } from "../../lib/store"
import { Button } from "../../components/ui/button"
import { Loader2, AlertTriangle } from "lucide-react"
import { DashboardContext } from "../../App"

interface DashbroadListingProps {
  onItemEdit: (itemId: number) => void
}

export const DashbroadListing = ({ onItemEdit }: DashbroadListingProps): JSX.Element => {
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [filteredItems, setFilteredItems] = useState<KnowledgeItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [groupByCategory, setGroupByCategory] = useState<string | null>(null)
  const [loadingOperation, setLoadingOperation] = useState<boolean>(false)
  
  // Access database state from Zustand store
  const { 
    pendingCreations, 
    pendingUpdates, 
    pendingDeletions,
    clearPendingChanges, 
    hasPendingChanges 
  } = useDatabase()

  // Add context directly here
  const { setShowDashboard } = useContext(DashboardContext)

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await fetchItems()
      
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
      setItems(data)
      setFilteredItems(data)
    } catch (error) {
      console.error("Error fetching items:", error)
      setError(`Failed to load items: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setItems([])
      setFilteredItems([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateDatabase = async () => {
    if (!hasPendingChanges()) {
      return
    }
    
    try {
      setLoadingOperation(true)
      
      // Process pending deletions
      for (const itemId of pendingDeletions) {
        await deleteItem(itemId)
        console.log(`Deleted item with ID: ${itemId}`)
      }
      
      // Process pending updates
      for (const item of pendingUpdates) {
        await updateItem(item.id, item)
        console.log(`Updated item with ID: ${item.id}`)
      }
      
      // Process pending creations
      for (const item of pendingCreations) {
        await createItem(item)
        console.log('Created new item:', item)
      }
      
      // Clear all pending changes
      clearPendingChanges()
      
      // Reload items to reflect changes
      await loadItems()
      
      alert("Database updated successfully!")
    } catch (error) {
      console.error("Error updating database:", error)
      alert(`Failed to update database: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoadingOperation(false)
    }
  }

  const handleFilterApply = (filtered: KnowledgeItem[]) => {
    setFilteredItems(filtered)
  }

  const handleGroupByCategory = (category: string | null) => {
    setGroupByCategory(category)
  }

  // Add a handler for create new
  const handleCreateNew = () => {
    console.log("DashbroadListing: handleCreateNew called")
    setShowDashboard(true)
  }

  // Render the main content section
  const renderMainContent = () => {
    if (error) {
      return (
        <div className="bg-red-900/50 p-6 rounded-lg border border-red-500/50 flex flex-col items-center justify-center h-64">
          <AlertTriangle className="text-red-200 h-12 w-12 mb-4" />
          <p className="text-red-200 text-lg font-medium mb-4">{error}</p>
          <Button 
            onClick={loadItems} 
            variant="outline" 
            className="border-red-500/50 text-red-200 hover:bg-red-900/50"
          >
            Try Again
          </Button>
        </div>
      )
    }
    
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-gray-200 text-lg">Loading items...</p>
          </div>
        </div>
      )
    }
    
    return (
      <OrderListSection 
        items={filteredItems}
        groupByCategory={groupByCategory}
        onItemEdit={onItemEdit}
      />
    )
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#2b2641] to-[#1a1625] overflow-hidden">
      {/* Sidebar */}
      <div className="w-[260px] h-full flex-shrink-0 border-r border-white/10">
        <FilterSection 
          items={items}
          onFilterApply={handleFilterApply}
          onGroupByCategory={handleGroupByCategory}
          onCreateNew={handleCreateNew}
        />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="p-6 flex justify-between items-center border-b border-white/10">
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          
          {hasPendingChanges() && (
            <Button 
              onClick={handleUpdateDatabase} 
              disabled={loadingOperation}
              className="bg-amber-600 hover:bg-amber-700 flex items-center gap-2"
            >
              {loadingOperation ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <span className="relative flex h-3 w-3 mr-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                  Update Database ({pendingCreations.length + pendingUpdates.length + pendingDeletions.size})
                </>
              )}
            </Button>
          )}
        </div>
        
        {/* Pending Changes Notification */}
        {hasPendingChanges() && (
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
        )}
        
        <div className="flex-1 overflow-auto p-6">
          {renderMainContent()}
        </div>
      </div>
    </div>
  )
} 