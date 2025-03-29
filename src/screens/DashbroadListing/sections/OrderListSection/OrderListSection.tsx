import { PencilIcon, TrashIcon, Eye, CheckSquare, Square, X, Trash2, ImageOff, Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../../components/ui/table";
import { KnowledgeItem } from "../../../../lib/db";
import { DashboardContext } from "../../../../App";
import { useContext } from "react";
import { useDatabase } from "../../../../lib/store";
import { Tooltip } from "../../../../components/ui/tooltip";
import { ErrorDisplay } from "../../../../components/ErrorDisplay";
import { AlertCircle } from "lucide-react";

// Fallback image path with a check if it exists, otherwise use a data URI
const FALLBACK_IMAGE = '/img/placeholder.png';
const DEFAULT_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMxODE4MjgiLz48cGF0aCBkPSJNNzQgODZINjRWMTI2SDc0VjEwNkg4NFY5Nkg3NFY4NloiIGZpbGw9IiM2MzY2RjEiLz48cGF0aCBkPSJNMTA0IDg2SDk0VjEyNkgxMDRWMTA2SDExNFY5NkgxMDRWODZaIiBmaWxsPSIjNjM2NkYxIi8+PHBhdGggZD0iTTEyNCAxMjZIMTM0VjEwNkgxNDRWMTI2SDE1NFY4NkgxNDRWOTZIMTM0Vjg2SDEyNFYxMjZaIiBmaWxsPSIjNjM2NkYxIi8+PC9zdmc+';

interface OrderListSectionProps {
  items: KnowledgeItem[];
  groupByCategory?: string | null;
  onItemEdit: (itemId: number) => void;
  onViewItem?: (item: KnowledgeItem) => void;
  onDeleteItem?: (itemId: number) => void;
}

export const OrderListSection = ({
  items = [],
  groupByCategory = null,
  onItemEdit,
  onViewItem,
  onDeleteItem,
}: OrderListSectionProps): JSX.Element => {
  const [orders, setOrders] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setShowDashboard } = useContext(DashboardContext);
  
  // State for multiple selection
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  // Get functions from the Zustand store
  const { addPendingDeletion } = useDatabase();

  // Update orders when items change
  useEffect(() => {
    try {
      if (!Array.isArray(items)) {
        console.error("Items is not an array:", items);
        setOrders([]);
        setError("Invalid data received from the server.");
        return;
      }
      
      if (items.length > 0) {
        // If groupByCategory is set, filter items by that category
        if (groupByCategory) {
          const filtered = items.filter(item => item.type === groupByCategory);
          setOrders(filtered);
          if (filtered.length === 0) {
            setError(`No items found in category "${groupByCategory}".`);
          } else {
            setError(null);
          }
        } else {
          setOrders(items);
          setError(null);
        }
      } else {
        setOrders([]);
        setError("No items found.");
      }
      
      // Reset selection whenever items change
      setSelectedItems(new Set());
      setIsSelectionMode(false);
    } catch (err) {
      console.error("Error processing items in OrderListSection:", err);
      setOrders([]);
      setError("An error occurred while processing the data.");
    }
  }, [items, groupByCategory]);

  // Handle edit
  const handleEdit = (item: KnowledgeItem) => {
    if (isSelectionMode) {
      handleToggleSelect(item.id);
      return;
    }
    
    try {
      if (!item || !item.id) {
        console.error("Cannot edit item with missing ID:", item);
        return;
      }
      
      // Create a formatted object with all the expected fields
      const formattedItem = {
        id: item.id,
        name: item.name || "",
        address: item.address || "",
        description: item.description || "",
        price: item.price || "",
        time: item.time || "",
        date: item.date || "",
        type: item.type || "",
        image: item.image || null,
        created_at: item.created_at || "",
        updated_at: item.updated_at || ""
      };
      
      // Store in localStorage for the form to pick up
      localStorage.setItem('editItem', JSON.stringify(formattedItem));
      localStorage.setItem('editItemId', formattedItem.id.toString());
      
      // Call the parent's onItemEdit handler
      onItemEdit(formattedItem.id);
    } catch (error) {
      console.error("Error preparing item for edit:", error);
      alert("Failed to prepare item for editing. Please try again.");
    }
  };

  // Handle view
  const handleView = (item: KnowledgeItem) => {
    if (isSelectionMode) {
      handleToggleSelect(item.id);
      return;
    }
    
    if (onViewItem && item) {
      onViewItem(item);
    }
  };

  // Handle delete
  const handleDelete = (id: number) => {
    if (id === undefined || id === null) {
      console.error("Cannot delete item with missing ID");
      return;
    }
    
    // If parent provided a delete handler, use it
    if (onDeleteItem) {
      onDeleteItem(id);
      return;
    }
    
    // Otherwise use the default implementation
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        // Remove from UI immediately but don't call the API yet
        setOrders(current => current.filter(item => item.id !== id));
        
        // Add to pending deletions in the Zustand store
        addPendingDeletion(id);
        
        // Show notification to the user
        console.log("Item marked for deletion. Click Update Database to apply changes.");
      } catch (error) {
        console.error("Error marking item for deletion:", error);
        alert("Failed to mark item for deletion. Please try again.");
      }
    }
  };
  
  // Toggle selection mode
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedItems(new Set());
  };
  
  // Toggle item selection
  const handleToggleSelect = (id: number) => {
    const newSelectedItems = new Set(selectedItems);
    if (newSelectedItems.has(id)) {
      newSelectedItems.delete(id);
    } else {
      newSelectedItems.add(id);
    }
    setSelectedItems(newSelectedItems);
  };
  
  // Select all items
  const handleSelectAll = () => {
    if (selectedItems.size === orders.length) {
      // If all are selected, deselect all
      setSelectedItems(new Set());
    } else {
      // Otherwise select all
      const newSelectedItems = new Set<number>();
      orders.forEach(item => newSelectedItems.add(item.id));
      setSelectedItems(newSelectedItems);
    }
  };
  
  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedItems.size === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedItems.size} selected item(s)?`)) {
      try {
        // Remove from UI immediately
        setOrders(current => current.filter(item => !selectedItems.has(item.id)));
        
        // Add all to pending deletions
        selectedItems.forEach(id => {
          addPendingDeletion(id);
        });
        
        // Reset selection
        setSelectedItems(new Set());
        setIsSelectionMode(false);
        
        // Show notification
        console.log(`${selectedItems.size} items marked for deletion. Click Update Database to apply changes.`);
      } catch (error) {
        console.error("Error marking items for deletion:", error);
        alert("Failed to mark items for deletion. Please try again.");
      }
    }
  };

  // Generate style for the type tag
  const getTypeStyle = (type: string) => {
    const typeColors: Record<string, { bg: string, text: string, border: string }> = {
      "Event": { bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-500/30" },
      "Food & Beverage": { bg: "bg-amber-500/20", text: "text-amber-300", border: "border-amber-500/30" },
      "Accommodation": { bg: "bg-indigo-500/20", text: "text-indigo-300", border: "border-indigo-500/30" },
      "Sightseeing Spots": { bg: "bg-purple-500/20", text: "text-purple-300", border: "border-purple-500/30" },
      "Entertainment": { bg: "bg-green-500/20", text: "text-green-300", border: "border-green-500/30" },
      "FAQ": { bg: "bg-blue-500/20", text: "text-blue-300", border: "border-blue-500/30" },
      "Tips": { bg: "bg-red-500/20", text: "text-red-300", border: "border-red-500/30" },
      "Contact": { bg: "bg-pink-500/20", text: "text-pink-300", border: "border-pink-500/30" },
      "SOS assistants": { bg: "bg-red-500/20", text: "text-red-300", border: "border-red-500/30" },
    };
    
    // For custom categories, generate a color based on the type name
    if (!typeColors[type]) {
      // Simple hash function to get a consistent color
      const hash = type.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const colors = [
        { bg: "bg-teal-500/20", text: "text-teal-300", border: "border-teal-500/30" },
        { bg: "bg-cyan-500/20", text: "text-cyan-300", border: "border-cyan-500/30" },
        { bg: "bg-sky-500/20", text: "text-sky-300", border: "border-sky-500/30" },
        { bg: "bg-fuchsia-500/20", text: "text-fuchsia-300", border: "border-fuchsia-500/30" },
        { bg: "bg-lime-500/20", text: "text-lime-300", border: "border-lime-500/30" },
        { bg: "bg-orange-500/20", text: "text-orange-300", border: "border-orange-500/30" },
      ];
      
      return colors[hash % colors.length];
    }
    
    return typeColors[type] || { bg: "bg-gray-500/20", text: "text-gray-300", border: "border-gray-500/30" };
  };

  // Function to truncate long text
  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };
  
  // Format date for display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return dateString;
    } catch (e) {
      return dateString;
    }
  };

  // Render orders grouped by category if requested
  const renderOrdersByCategory = () => {
    if (!groupByCategory) {
      return renderOrdersTable(orders);
    }
    
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-white/10">
          <div className={`h-3 w-3 rounded-full ${getTypeStyle(groupByCategory).bg.replace("/20", "")}`}></div>
          <h2 className="text-lg font-medium text-white">
            {groupByCategory}
          </h2>
          <span className="text-white/50 text-sm">({orders.length} items)</span>
        </div>
        {renderOrdersTable(orders)}
      </div>
    );
  };

  // Render the orders table
  const renderOrdersTable = (itemsToRender: KnowledgeItem[]) => {
    // We need a consistent table structure for all items to prevent layout issues
    const isGrouped = !!groupByCategory;
    const isFAQTable = groupByCategory === "FAQ";
    const isSOSTable = groupByCategory === "SOS assistants";
    
    // Show all columns by default in the main listing view
    const showAllColumns = !isGrouped;
    
    return (
      <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/[0.02] shadow-lg backdrop-blur-[2px]">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-[#2b2641]/80 to-[#1a1625]/80 hover:bg-white/5">
              {isSelectionMode && (
                <TableHead className="w-[40px] text-white/80 font-medium uppercase text-xs tracking-wider">
                  <div className="flex justify-center">
                    <button 
                      onClick={handleSelectAll}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      aria-label={selectedItems.size === orders.length ? "Deselect all" : "Select all"}
                    >
                      {selectedItems.size === orders.length ? (
                        <CheckSquare className="h-4 w-4 text-indigo-400" />
                      ) : (
                        <Square className="h-4 w-4 text-white/60" />
                      )}
                    </button>
                  </div>
                </TableHead>
              )}
              <TableHead className="w-[80px] text-white/80 font-medium uppercase text-xs tracking-wider text-center">Image</TableHead>
              <TableHead className="w-[180px] text-white/80 font-medium uppercase text-xs tracking-wider">
                {isFAQTable ? "Question" : isSOSTable ? "Support Type" : "Name"}
              </TableHead>
              
              {/* Date, Time, Price headers - always show in main listing, hide in FAQ group view */}
              {(showAllColumns || !isFAQTable) && (
                <>
                  <TableHead className="w-[100px] text-white/80 font-medium uppercase text-xs tracking-wider">Date</TableHead>
                  <TableHead className="w-[80px] text-white/80 font-medium uppercase text-xs tracking-wider">Time</TableHead>
                  <TableHead className="w-[80px] text-white/80 font-medium uppercase text-xs tracking-wider">Price</TableHead>
                </>
              )}
              
              {/* Always show Address header */}
              <TableHead className="w-[180px] text-white/80 font-medium uppercase text-xs tracking-wider">Address</TableHead>
              
              <TableHead className="text-white/80 font-medium uppercase text-xs tracking-wider hidden md:table-cell">
                {isFAQTable ? "Answer" : isSOSTable ? "Contact Information" : "Description"}
              </TableHead>
              
              {/* Type header - always show in main listing, hide in grouped views */}
              {(showAllColumns || (!isFAQTable && !isSOSTable)) && (
                <TableHead className="w-[120px] text-white/80 font-medium uppercase text-xs tracking-wider">Type</TableHead>
              )}
              
              <TableHead className="w-[140px] text-center text-white/80 font-medium uppercase text-xs tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itemsToRender.length > 0 ? (
              itemsToRender.map((order) => {
                // Extract phone number for SOS assistants
                const phoneNumber = order.type === "SOS assistants" && order.description ? 
                  order.description.match(/Phone number:[^\n]*/)?.[0] : null;
                
                return (
                <TableRow 
                  key={order.id} 
                  className={`border-t border-white/5 hover:bg-white/[0.05] transition-all duration-200 group table-row-hover ${selectedItems.has(order.id) ? 'bg-indigo-900/20' : ''}`}
                  onClick={() => isSelectionMode ? handleToggleSelect(order.id) : null}
                >
                  {isSelectionMode && (
                    <TableCell className="text-center">
                      <div className="flex justify-center">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleToggleSelect(order.id); }}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                          aria-label={selectedItems.has(order.id) ? "Deselect" : "Select"}
                        >
                          {selectedItems.has(order.id) ? (
                            <CheckSquare className="h-4 w-4 text-indigo-400" />
                          ) : (
                            <Square className="h-4 w-4 text-white/60" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                  )}
                  
                  {/* Image cell - always show */}
                  <TableCell className="text-center py-2">
                    <div className="relative w-12 h-12 rounded overflow-hidden mx-auto bg-black/30 border border-white/5 group image-hover-zoom">
                      {order.image ? (
                        <>
                          <img 
                            src={order.image}
                            alt={order.name || "Item"}
                            className="w-full h-full object-cover transition-all duration-300"
                            onError={(e) => {
                              // Try the fallback image first, and if that fails, use our embedded SVG data URL
                              try {
                                (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                                // Mark the parent as having an error for styling
                                (e.currentTarget.parentNode as HTMLElement).classList.add('image-error');
                              } catch {
                                (e.target as HTMLImageElement).src = DEFAULT_IMAGE;
                              }
                            }}
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Eye className="h-4 w-4 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full w-full bg-black/40">
                          <ImageOff className="h-5 w-5 text-white/40" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* Name/Question/Support Type cell - always show */}
                  <TableCell className="font-medium text-white group-hover:text-indigo-200 transition-colors table-cell-optimize" 
                    data-tooltip={order.name || "Untitled Item"}>
                    <div className="truncate-cell overflow-tooltip">
                      {order.name || "Untitled Item"}
                    </div>
                  </TableCell>
                  
                  {/* Date/Time/Price cells - conditionally show based on type and view mode */}
                  {(showAllColumns || order.type !== "FAQ") ? (
                    <>
                      <TableCell className="text-white/80">
                        {formatDate(order.date)}
                      </TableCell>
                      <TableCell className="text-white/80">
                        {order.time || "N/A"}
                      </TableCell>
                      <TableCell className="text-white/80">
                        {order.price ? (
                          <span className="font-medium text-green-400">{order.price}</span>
                        ) : (
                          <span className="text-white/50">Free</span>
                        )}
                      </TableCell>
                    </>
                  ) : (
                    // Hidden spanning cell for FAQ items when in grouped view
                    <TableCell colSpan={3} className="hidden"></TableCell>
                  )}
                  
                  {/* Address cell - always show (may be empty for FAQ) */}
                  <TableCell className="text-white/80 table-cell-optimize" data-tooltip={order.address || "N/A"}>
                    <div className="truncate-cell overflow-tooltip">
                      {order.address || "N/A"}
                    </div>
                  </TableCell>
                  
                  {/* Description/Answer/Contact cell - always show */}
                  <TableCell className="text-white/80 hidden md:table-cell">
                    {order.type === "SOS assistants" && phoneNumber ? (
                      <div className="line-clamp-2 multiline-truncate font-medium text-red-300" data-tooltip={order.description || 'No contact information'}>
                        {phoneNumber}
                      </div>
                    ) : (
                      <div className="line-clamp-2 multiline-truncate" data-tooltip={order.description || 'No description'}>
                        {order.description || 'No description'}
                      </div>
                    )}
                  </TableCell>
                  
                  {/* Type cell - conditionally show based on type and view mode */}
                  {(showAllColumns || (order.type !== "FAQ" && order.type !== "SOS assistants")) ? (
                    <TableCell>
                      <span 
                        className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center justify-center ${getTypeStyle(order.type || "Custom").bg} ${getTypeStyle(order.type || "Custom").text} border ${getTypeStyle(order.type || "Custom").border} transition-transform group-hover:scale-105`}
                      >
                        {order.type || "Custom"}
                      </span>
                    </TableCell>
                  ) : (
                    // Hidden cell for FAQ/SOS items when in grouped view
                    <TableCell className="hidden"></TableCell>
                  )}
                  
                  {/* Actions cell - always show */}
                  <TableCell>
                    <div className="flex items-center justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity action-button-group">
                      <Tooltip content="View Details">
                        <Button
                          variant="action"
                          size="icon-sm"
                          rounded="full"
                          className="bg-indigo-500/10 text-indigo-300 hover:bg-indigo-600/30 hover:text-indigo-200 transition-all duration-200 scale-90 group-hover:scale-100 shadow-sm shadow-indigo-900/20 action-button"
                          onClick={(e) => { e.stopPropagation(); handleView(order); }}
                          aria-label="View item details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Tooltip>
                      
                      <Tooltip content="Edit">
                        <Button
                          variant="edit"
                          size="icon-sm"
                          rounded="full"
                          className="bg-blue-500/10 text-blue-300 hover:bg-blue-600/30 hover:text-blue-200 transition-all duration-200 scale-90 group-hover:scale-100 shadow-sm shadow-blue-900/20 action-button"
                          onClick={(e) => { e.stopPropagation(); handleEdit(order); }}
                          aria-label="Edit item"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </Button>
                      </Tooltip>
                      
                      <Tooltip content="Delete">
                        <Button
                          variant="delete"
                          size="icon-sm"
                          rounded="full"
                          className="bg-red-500/10 text-red-300 hover:bg-red-600/30 hover:text-red-200 transition-all duration-200 scale-90 group-hover:scale-100 shadow-sm shadow-red-900/20 action-button"
                          onClick={(e) => { e.stopPropagation(); handleDelete(order.id); }}
                          aria-label="Delete item"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </Button>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              )})
            ) : (
              <TableRow>
                <TableCell colSpan={
                  // Calculate the number of columns based on what's visible
                  1 + // Image (always shown)
                  1 + // Name/Question/Support (always shown)
                  (showAllColumns || !isFAQTable ? 3 : 0) + // Date, Time, Price columns
                  1 + // Address (always shown)
                  1 + // Description (always shown)
                  (showAllColumns || (!isFAQTable && !isSOSTable) ? 1 : 0) + // Type column
                  1 + // Actions (always shown)
                  (isSelectionMode ? 1 : 0) // Selection checkbox column
                } className="text-center py-12 text-white/50">
                  <div className="flex flex-col items-center justify-center space-y-3 animate-pulse-subtle">
                    {error ? (
                      <AlertCircle className="h-7 w-7 text-white/30" />
                    ) : (
                      <Eye className="h-7 w-7 text-white/30" />
                    )}
                    <div className="text-lg font-medium text-white/60">
                      {error || "No items found"}
                    </div>
                    <div className="text-sm text-white/40">
                      {error 
                        ? "Try adjusting your filters or refreshing the page" 
                        : "Try creating a new item or changing your filters"}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Show error if any
  if (error && orders.length === 0) {
    return (
      <ErrorDisplay 
        message={error}
        type="info"
        className="mb-4"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with item count and selection actions */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-white/60">
          {orders.length} {orders.length === 1 ? 'item' : 'items'} found
          {isSelectionMode && selectedItems.size > 0 && (
            <span className="ml-2 text-indigo-300">
              ({selectedItems.size} selected)
            </span>
          )}
        </div>
        
        {/* Selection mode controls */}
        <div className="flex items-center gap-2">
          {isSelectionMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectionMode}
                className="bg-slate-600/20 text-slate-300 hover:bg-slate-500/30 hover:text-slate-200 border-slate-500/20 transition-all duration-200 shadow-sm hover:shadow-slate-900/20 action-button"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={selectedItems.size === 0}
                className={`bg-red-600/20 text-red-300 hover:bg-red-500/30 hover:text-red-200 border-red-500/20 transition-all duration-200 shadow-sm hover:shadow-red-900/20 action-button ${selectedItems.size === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete Selected ({selectedItems.size})
              </Button>
            </>
          ) : (
            orders.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectionMode}
                className="bg-indigo-600/20 text-indigo-300 hover:bg-indigo-500/30 hover:text-indigo-200 border-indigo-500/20 transition-all duration-200 shadow-sm hover:shadow-indigo-900/20 action-button"
              >
                <CheckSquare className="h-3.5 w-3.5 mr-1" />
                Select Items
              </Button>
            )
          )}
        </div>
      </div>
      
      {/* Render orders by category or as a flat list */}
      {renderOrdersByCategory()}
    </div>
  );
};
