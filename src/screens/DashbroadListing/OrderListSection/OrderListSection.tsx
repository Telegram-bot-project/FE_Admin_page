import { PencilIcon, TrashIcon, Eye } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { KnowledgeItem } from "../../../lib/db";
import { DashboardContext } from "../../../App";
import { useContext } from "react";
import { useDatabase } from "../../../lib/store";
import { Tooltip } from "../../../components/ui/tooltip";

interface OrderListSectionProps {
  items: KnowledgeItem[];
  groupByCategory?: string | null;
  onItemEdit: (itemId: number) => void;
}

export const OrderListSection = ({
  items = [],
  groupByCategory = null,
  onItemEdit,
}: OrderListSectionProps): JSX.Element => {
  const [orders, setOrders] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setShowDashboard } = useContext(DashboardContext);
  
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
    } catch (err) {
      console.error("Error processing items in OrderListSection:", err);
      setOrders([]);
      setError("An error occurred while processing the data.");
    }
  }, [items, groupByCategory]);

  // Handle edit
  const handleEdit = (item: KnowledgeItem) => {
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

  // Handle delete
  const handleDelete = (id: number) => {
    if (id === undefined || id === null) {
      console.error("Cannot delete item with missing ID");
      return;
    }
    
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

  // Generate style for the type tag
  const getTypeStyle = (type: string) => {
    const typeColors: Record<string, { bg: string, text: string, border: string }> = {
      "Event": { bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-500/30" },
      "Accommodation": { bg: "bg-indigo-500/20", text: "text-indigo-300", border: "border-indigo-500/30" },
      "Food & Beverage": { bg: "bg-amber-500/20", text: "text-amber-300", border: "border-amber-500/30" },
      "Sightseeing Spots": { bg: "bg-purple-500/20", text: "text-purple-300", border: "border-purple-500/30" },
      "Entertainment": { bg: "bg-green-500/20", text: "text-green-300", border: "border-green-500/30" },
      "Tips": { bg: "bg-red-500/20", text: "text-red-300", border: "border-red-500/30" },
      "Contact": { bg: "bg-pink-500/20", text: "text-pink-300", border: "border-pink-500/30" },
      "Custom": { bg: "bg-blue-500/20", text: "text-blue-300", border: "border-blue-500/30" },
    };
    
    return typeColors[type] || { bg: "bg-gray-500/20", text: "text-gray-300", border: "border-gray-500/30" };
  };

  // Function to truncate long text
  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Render orders grouped by category if requested
  const renderOrdersByCategory = () => {
    if (!groupByCategory) {
      return renderOrdersTable(orders);
    }
    
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-white/10">
          <div className="h-3 w-3 rounded-full bg-indigo-500"></div>
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
    return (
      <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/[0.02] shadow-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-white/5 hover:bg-white/5">
              <TableHead className="w-[80px] text-white/80 font-medium uppercase text-xs tracking-wider">Price</TableHead>
              <TableHead className="text-white/80 font-medium uppercase text-xs tracking-wider">Address</TableHead>
              <TableHead className="text-white/80 font-medium uppercase text-xs tracking-wider">Description</TableHead>
              <TableHead className="w-[120px] text-white/80 font-medium uppercase text-xs tracking-wider">Type</TableHead>
              <TableHead className="w-[100px] text-center text-white/80 font-medium uppercase text-xs tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itemsToRender.length > 0 ? (
              itemsToRender.map((order) => (
                <TableRow 
                  key={order.id} 
                  className="border-t border-white/5 hover:bg-white/[0.03] transition-colors"
                >
                  <TableCell className="font-medium">
                    {order.price || "Free"}
                  </TableCell>
                  <TableCell className="text-white/80">
                    {order.address || "N/A"}
                  </TableCell>
                  <TableCell className="text-white/80">
                    <div className="max-w-md">
                      {truncateText(order.description || '', 80)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span 
                      className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center justify-center ${getTypeStyle(order.type || "").bg} ${getTypeStyle(order.type || "").text} border ${getTypeStyle(order.type || "").border}`}
                    >
                      {order.type || "Custom"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1.5">
                      <Tooltip content="Edit">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-white/[0.03] hover:bg-white/10 hover:text-white text-white/70 hover:scale-105 transition-all"
                          onClick={() => handleEdit(order)}
                          aria-label="Edit item"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                      
                      <Tooltip content="Delete">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-white/[0.03] hover:bg-red-500/20 hover:text-red-400 text-white/70 hover:scale-105 transition-all"
                          onClick={() => handleDelete(order.id)}
                          aria-label="Delete item"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-white/50">
                  {error || "No items found."}
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
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-6 text-center text-white/60">
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Show count of items */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-white/60">
          {orders.length} {orders.length === 1 ? 'item' : 'items'} found
        </div>
      </div>
      
      {/* Render orders by category or as a flat list */}
      {renderOrdersByCategory()}
    </div>
  );
}; 