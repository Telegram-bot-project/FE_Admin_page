import { ArrowDownUp, ChevronDown, ChevronUp, LayoutGrid, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import React, { useContext, useState, useEffect } from "react";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";
import { Checkbox } from "../../../../components/ui/checkbox";
import { DashboardContext } from "../../../../App";
import { CategoryPopup } from "../../../../components/CategoryPopup/CategoryPopup";
import { Input } from "../../../../components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../components/ui/popover";
import { KnowledgeItem } from "../../../../lib/db";
import { Badge } from "../../../../components/ui/badge";
import { DatabaseIcon } from "lucide-react";

interface FilterSectionProps {
  items: KnowledgeItem[];
  onFilterApply: (filtered: KnowledgeItem[]) => void;
  onGroupByCategory: (category: string | null) => void;
  onCreateNew?: () => void;
}

// Define the Category interface
interface Category {
  id: number;
  name: string;
  icon: string;
}

export const FilterSection = ({ 
  items = [],
  onFilterApply,
  onGroupByCategory,
  onCreateNew
}: FilterSectionProps): JSX.Element => {
  // Use the dashboard context to control the dashboard visibility
  let contextSetShowDashboard: React.Dispatch<React.SetStateAction<boolean>> | null = null;
  
  try {
    const { setShowDashboard } = useContext(DashboardContext);
    contextSetShowDashboard = setShowDashboard;
  } catch (error) {
    console.error("Error accessing DashboardContext:", error);
  }
  
  // Add state to track sidebar minimization
  const [isMinimized, setIsMinimized] = useState(false);
  const [showCategoryPopup, setShowCategoryPopup] = useState(false);
  
  // Add states for new functionality
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Categories data
  const categories: Category[] = [
    {
      id: 1,
      name: "Event",
      icon: "/img/Event.png",
    },
    {
      id: 2,
      name: "Food & Drink",
      icon: "/img/Food & Drink.png",
    },
    {
      id: 3,
      name: "Accommodation",
      icon: "/img/Accommodation.png",
    },
    {
      id: 4,
      name: "Sightseeing Spots",
      icon: "/img/Sightseeing Spots.png",
    },
    {
      id: 5,
      name: "Entertainment",
      icon: "/img/Entertainment.png",
    },
    {
      id: 6,
      name: "Tips",
      icon: "/img/Tips.png",
    },
    {
      id: 7,
      name: "Contact",
      icon: "/img/Contact.png",
    },
    {
      id: 8,
      name: "Create more",
      icon: "/img/_Create more_.png",
    },
  ];

  // Filter types data for mapping - ensure these match the actual types from the API
  const filterTypes = [
    { id: "Event", label: "Event", color: "#00b69b" },
    { id: "Accommodation", label: "Accommodation", color: "#3d369f" },
    { id: "Food & Drink", label: "Food & Drink", color: "#f2ac34" },
    { id: "Sightseeing Spots", label: "Sightseeing Spots", color: "#a000b6" },
    { id: "Entertainment", label: "Entertainment", color: "#5e9f36" },
    { id: "Tips", label: "Tips", color: "#f23a34" },
    { id: "Contact", label: "Contact", color: "#4c0f4b" },
  ];

  // Apply all filters and sorting
  useEffect(() => {
    try {
      if (!Array.isArray(items)) {
        console.error("Items is not an array:", items);
        onFilterApply([]);
        return;
      }
      
      let filteredResults = [...items];
      
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredResults = filteredResults.filter(item => 
          (item.name && item.name.toLowerCase().includes(searchLower)) ||
          (item.description && item.description.toLowerCase().includes(searchLower)) ||
          (item.address && item.address.toLowerCase().includes(searchLower)) ||
          (item.type && item.type.toLowerCase().includes(searchLower))
        );
      }
      
      // Apply type filters
      if (selectedTypes.length > 0) {
        filteredResults = filteredResults.filter(item => 
          item.type && selectedTypes.includes(item.type)
        );
      }
      
      // Apply sorting
      filteredResults.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return sortOrder === 'latest' ? dateB - dateA : dateA - dateB;
      });
      
      // Count active filters
      let count = 0;
      if (searchTerm) count++;
      if (selectedTypes.length > 0) count++;
      if (sortOrder !== 'latest') count++;
      if (selectedCategory) count++;
      setActiveFiltersCount(count);
      
      // Send filtered results to parent
      onFilterApply(filteredResults);
    } catch (error) {
      console.error("Error filtering items:", error);
      onFilterApply([]);
    }
  }, [items, searchTerm, selectedTypes, sortOrder, onFilterApply, selectedCategory]);

  // Handle category selection
  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
    onGroupByCategory(category);
  };

  // Toggle sidebar minimization
  const toggleSidebar = () => {
    const newMinimizedState = !isMinimized;
    setIsMinimized(newMinimizedState);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  // Handle sort order change
  const handleSortChange = (value: 'latest' | 'oldest') => {
    setSortOrder(value);
  };

  // Handle type filter change
  const handleTypeChange = (typeId: string, checked: boolean) => {
    let newSelectedTypes = [...selectedTypes];
    
    if (checked) {
      newSelectedTypes.push(typeId);
    } else {
      newSelectedTypes = newSelectedTypes.filter(id => id !== typeId);
    }
    
    setSelectedTypes(newSelectedTypes);
  };

  // Count items by type with null checking
  const getTypeCount = (type: string) => {
    if (!Array.isArray(items)) return 0;
    return items.filter(item => item && item.type === type).length;
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("");
    setSortOrder('latest');
    setSelectedTypes([]);
    setSelectedCategory(null);
  };

  return (
    <div className="h-full flex flex-col py-6 overflow-hidden">
      {/* Header with App Logo */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <DatabaseIcon className="h-4 w-4 text-white" />
          </div>
          <div className="text-white font-bold text-xl">TeleBot</div>
        </div>
      </div>

      {/* Create Button */}
      <div className="px-6 mb-6">
        <Button 
          className="w-full h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-md font-semibold text-white hover:opacity-90 transition-opacity"
          onClick={() => {
            console.log("Create button clicked");
            
            // First try the direct callback which is safer
            if (onCreateNew) {
              console.log("Calling onCreateNew callback");
              onCreateNew();
              console.log("Called onCreateNew callback");
            }
            
            // Also try the context approach as a fallback
            if (contextSetShowDashboard) {
              console.log("About to call contextSetShowDashboard(true)");
              try {
                contextSetShowDashboard(true);
                console.log("Called contextSetShowDashboard(true)");
              } catch (error) {
                console.error("Error calling contextSetShowDashboard:", error);
              }
            } else {
              console.error("Context function setShowDashboard is not available");
            }
          }}
        >
          + Create New
        </Button>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/10 mx-4 mb-6"></div>

      {/* Filter Section */}
      <div className="px-6 mb-4">
        <div className="flex justify-between items-center mb-4">
          <div className="text-white/90 font-medium text-sm flex items-center">
            <SlidersHorizontal className="w-4 h-4 mr-2 opacity-70" />
            FILTERS
            {activeFiltersCount > 0 && (
              <Badge className="ml-2 bg-indigo-500/30 text-indigo-200 font-medium text-[10px] py-0 h-5">
                {activeFiltersCount}
              </Badge>
            )}
          </div>
          
          {activeFiltersCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 px-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"
              onClick={resetFilters}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          )}
        </div>

        {/* Search Input */}
        <div className="mb-4">
          <div className="relative">
            <Input
              placeholder="Search..."
              className="bg-white/5 border-white/10 pl-10 h-9 text-white placeholder:text-white/40 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500/40"
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
            {searchTerm && (
              <Button
                variant="ghost"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-white/10"
                onClick={() => {
                  setSearchTerm("");
                }}
              >
                <X className="h-3 w-3 text-white/60" />
              </Button>
            )}
          </div>
        </div>

        {/* Sort Options */}
        <div className="mb-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline"
                className="w-full justify-between h-9 bg-white/5 border-white/10 hover:bg-white/10 text-left text-white/80 font-medium text-sm"
              >
                <div className="flex items-center">
                  <ArrowDownUp className="mr-2 h-4 w-4 opacity-70" />
                  {sortOrder === 'latest' ? 'Latest First' : 'Oldest First'}
                </div>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 bg-[#252136] border-white/10">
              <div className="flex flex-col">
                <Button 
                  variant="ghost" 
                  className={`justify-start text-white/80 hover:text-white ${sortOrder === 'latest' ? 'bg-indigo-500/20' : ''}`}
                  onClick={() => handleSortChange('latest')}
                >
                  Latest First
                </Button>
                <Button 
                  variant="ghost" 
                  className={`justify-start text-white/80 hover:text-white ${sortOrder === 'oldest' ? 'bg-indigo-500/20' : ''}`}
                  onClick={() => handleSortChange('oldest')}
                >
                  Oldest First
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Type Section - Collapsible */}
      <div className="px-6 flex-1 overflow-y-auto sidebar-scroll">
        <div 
          className="text-white/90 font-medium text-sm mb-3 flex items-center justify-between cursor-pointer"
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
        >
          <span>FILTER BY TYPE</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-white/70 hover:bg-white/10 hover:text-white">
            {isFilterExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {isFilterExpanded && (
          <div className="space-y-3 pb-4">
            {filterTypes.map((type) => (
              <div key={type.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <Checkbox
                    id={type.id}
                    checked={selectedTypes.includes(type.id)}
                    onCheckedChange={(checked) => handleTypeChange(type.id, checked === true)}
                    className="w-4 h-4 rounded-sm border-[1.5px] data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                    style={{ borderColor: selectedTypes.includes(type.id) ? "rgb(99 102 241)" : "rgba(255, 255, 255, 0.2)" }}
                  />
                  <label
                    htmlFor={type.id}
                    className="text-white/80 text-sm ml-3 cursor-pointer"
                  >
                    {type.label}
                  </label>
                </div>
                <Badge 
                  variant="outline" 
                  className="bg-white/5 border-white/10 text-white/60 text-[10px]"
                >
                  {getTypeCount(type.label)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom section with app version */}
      <div className="mt-auto pt-4 px-6 text-white/30 text-xs border-t border-white/10">
        TeleBot v1.0.0
      </div>
    </div>
  );
}