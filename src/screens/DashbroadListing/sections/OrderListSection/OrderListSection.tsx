import { PencilIcon, TrashIcon } from "lucide-react";
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
    const typeColors: Record<string, { bg: string, text: string }> = {
      "Event": { bg: "bg-emerald-500/20", text: "text-emerald-300" },
      "Accommodation": { bg: "bg-indigo-500/20", text: "text-indigo-300" },
      "Food & Drink": { bg: "bg-amber-500/20", text: "text-amber-300" },
      "Sightseeing Spots": { bg: "bg-purple-500/20", text: "text-purple-300" },
      "Entertainment": { bg: "bg-green-500/20", text: "text-green-300" },
      "Tips": { bg: "bg-red-500/20", text: "text-red-300" },
      "Contact": { bg: "bg-pink-500/20", text: "text-pink-300" },
    };
    
    return typeColors[type] || { bg: "bg-gray-500/20", text: "text-gray-300" };
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
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <Table>
          <TableHeader>
            <TableRow className="bg-white/5 hover:bg-white/5">
              <TableHead className="w-[80px] text-white/70 font-medium">IMAGE</TableHead>
              <TableHead className="text-white/70 font-medium">NAME</TableHead>
              <TableHead className="w-[120px] text-white/70 font-medium">DATE</TableHead>
              <TableHead className="w-[120px] text-white/70 font-medium">TIME</TableHead>
              <TableHead className="w-[100px] text-white/70 font-medium">PRICE</TableHead>
              <TableHead className="text-white/70 font-medium">ADDRESS</TableHead>
              <TableHead className="text-white/70 font-medium">DESCRIPTION</TableHead>
              <TableHead className="w-[120px] text-white/70 font-medium">TYPE</TableHead>
              <TableHead className="w-[120px] text-right text-white/70 font-medium">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itemsToRender.length > 0 ? (
              itemsToRender.map((order) => (
                <TableRow 
                  key={order.id} 
                  className="border-t border-white/5 hover:bg-white/5"
                >
                  <TableCell>
                    {order.image ? (
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-white/5 flex items-center justify-center">
                        <img 
                          src={order.image.startsWith('data:') ? order.image : `data:image/jpeg;base64,${order.image}`} 
                          alt={order.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://placehold.co/100x100/373151/FFFFFF?text=No+Image';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-md bg-white/5 flex items-center justify-center text-white/30 text-xs">
                        No Image
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-white font-medium">{order.name}</TableCell>
                  <TableCell className="text-white/70">{order.date}</TableCell>
                  <TableCell className="text-white/70">{order.time}</TableCell>
                  <TableCell className="text-white/70">{order.price}</TableCell>
                  <TableCell className="text-white/70">{truncateText(order.address || '', 30)}</TableCell>
                  <TableCell className="text-white/70">
                    <div className="max-w-[200px]">
                      {truncateText(order.description || '', 60)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span 
                      className={`px-2 py-1 rounded-full text-xs font-medium inline-block ${getTypeStyle(order.type || "").bg} ${getTypeStyle(order.type || "").text}`}
                    >
                      {order.type}
                    </span>
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-white/10 bg-white/5 hover:bg-white/10 hover:text-white"
                      onClick={() => handleEdit(order)}
                    >
                      <PencilIcon className="h-4 w-4 text-white/70" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-white/10 bg-white/5 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/20"
                      onClick={() => handleDelete(order.id)}
                    >
                      <TrashIcon className="h-4 w-4 text-white/70" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16 text-white/50 italic">
                  {error || "No items found"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        renderOrdersByCategory()
      )}
    </div>
  );
};
