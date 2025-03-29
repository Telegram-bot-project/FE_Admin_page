import { ArrowDownUp, ChevronDown, ChevronUp, LayoutGrid, RefreshCw, Search, SlidersHorizontal, X, Filter, Plus, LogOut, Database as DatabaseIcon, Check, PanelLeftClose, PanelLeftOpen, AlertCircle } from "lucide-react";
import React, { useContext, useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";
import { Checkbox } from "../../../../components/ui/checkbox";
import { DashboardContext } from "../../../../App";
import { CategoryPopup } from "../../../../components/CategoryPopup/CategoryPopup";
import { Input } from "../../../../components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../components/ui/popover";
import { KnowledgeItem, getAllCategories, deleteCategory, VALID_CATEGORIES, getCategoriesWithDetails } from "../../../../lib/db";
import { Badge } from "../../../../components/ui/badge";
import { useDatabase } from '../../../../lib/store';

interface FilterSectionProps {
  items: KnowledgeItem[];
  onFilterApply: (filtered: KnowledgeItem[]) => void;
  onGroupByCategory: (category: string | null) => void;
  onCreateNew?: () => void;
  onSidebarToggle?: (minimized: boolean) => void;
}

// Define the Category interface
interface Category {
  id: number;
  name: string;
  icon: string;
}

interface FilterType {
  id: string;
  label: string;
  color: string;
}

// Define the default categories that cannot be deleted
const DEFAULT_CATEGORIES = [
  "Event",
  "Food & Beverage",
  "Accommodation",
  "Sightseeing Spots",
  "Entertainment",
  "FAQ",
  "SOS assistants"
];

export const FilterSection = ({ 
  items = [],
  onFilterApply,
  onGroupByCategory,
  onCreateNew,
  onSidebarToggle
}: FilterSectionProps): JSX.Element => {
  // Use the dashboard context to control the dashboard visibility
  let contextSetShowDashboard: React.Dispatch<React.SetStateAction<boolean>> | null = null;
  
  try {
    const { setShowDashboard } = useContext(DashboardContext);
    contextSetShowDashboard = setShowDashboard;
  } catch (error) {
    console.error("Error accessing DashboardContext:", error);
  }
  
  // State definitions
  const [isMinimized, setIsMinimized] = useState(false);
  const [showCategoryPopup, setShowCategoryPopup] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState(true);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filterTypes, setFilterTypes] = useState<FilterType[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Add this near the top of the component, where other hooks are defined
  const { databaseUpdated, lastUpdateTime } = useDatabase();

  // Helper to generate consistent colors for categories
  const generateCategoryColor = (categoryName: string): string => {
    // Predefined colors for standard categories
    const standardColors: Record<string, string> = {
      "Event": "#00b69b",
      "Food & Beverage": "#f2ac34",
      "Accommodation": "#3d369f",
      "Sightseeing Spots": "#a000b6",
      "Entertainment": "#5e9f36",
      "FAQ": "#f23a34",
      "SOS assistants": "#4c0f4b"
    };
    
    if (standardColors[categoryName]) {
      return standardColors[categoryName];
    }
    
    // For custom categories, generate a color based on the name
    const hashCode = categoryName.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    // Generate HSL color with good saturation and lightness
    const h = Math.abs(hashCode) % 360;
    return `hsl(${h}, 70%, 45%)`;
  };
  
  // Update the loadCategories function to handle proper category loading
  const loadCategories = useCallback(async () => {
    try {
      setIsLoadingCategories(true);
      setCategoryError(null);
      
      // Get all categories including custom ones
      const categories = getAllCategories();
      setAllCategories(categories);

      // Generate colors for categories
      const colors: Record<string, string> = {};
      categories.forEach(cat => {
        colors[cat] = generateCategoryColor(cat);
      });
      setCategoryColors(colors);

      // Create filter types from categories
      const types: FilterType[] = categories.map(cat => ({
        id: cat,
        label: cat,
        color: colors[cat]
      }));

      setFilterTypes(types);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategoryError('Failed to load categories. Please try again.');
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  // Correct implementation of the useEffect hook to reload categories when database is updated
  useEffect(() => {
    // Initial load
    loadCategories();
    
    // Reload when database is updated
    if (databaseUpdated) {
      console.log("Database update detected, reloading categories...");
      loadCategories();
    }
  }, [loadCategories, databaseUpdated, lastUpdateTime]);

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
    // Notify parent component about sidebar state
    if (onSidebarToggle) {
      onSidebarToggle(newMinimizedState);
    }
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

  // Handle category deletion
  const handleDeleteCategory = async (categoryId: string) => {
    try {
      // First check if it's a default category that cannot be deleted
      if (DEFAULT_CATEGORIES.includes(categoryId)) {
        alert("Default categories cannot be deleted.");
        return;
      }

      // Find the category details from filterTypes to get the correct ID
      const categoryDetails = filterTypes.find(type => type.id === categoryId);
      if (!categoryDetails) {
        console.error(`Category with ID "${categoryId}" not found in filterTypes`);
        alert('Cannot delete category: Category not found.');
        return;
      }

      if (window.confirm(`Are you sure you want to delete the category "${categoryId}"?`)) {
        try {
          // Try to find the category in the API categories by matching name
          const apiCategories = await getCategoriesWithDetails();
          const apiCategory = apiCategories.find(cat => cat.name === categoryId);
          
          if (!apiCategory) {
            console.error(`API category with name "${categoryId}" not found`);
            throw new Error('Category not found in the database');
          }
          
          // Call deleteCategory with the numeric ID from the API
          await deleteCategory(apiCategory.id);
          
          // Update local state
          setAllCategories(prev => prev.filter(cat => cat !== categoryId));
          setFilterTypes(prev => prev.filter(type => type.id !== categoryId));

          // If the deleted category was selected, reset filters
          if (selectedTypes.includes(categoryId)) {
            setSelectedTypes(prev => prev.filter(id => id !== categoryId));
          }

          console.log(`Category "${categoryId}" deleted successfully`);
        } catch (error) {
          console.error('Error deleting category:', error);
          alert('Failed to delete category. Please try again.');
        }
      }
    } catch (error) {
      console.error('Unexpected error in handleDeleteCategory:', error);
      alert('An unexpected error occurred. Please try again.');
    }
  };

  // Update renderCategoryList to use API categories
  const renderCategoryList = () => {
    if (isLoadingCategories) {
      return (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin h-5 w-5 text-indigo-400">
            <svg className="h-full w-full" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        </div>
      );
    }

    if (categoryError) {
      return (
        <div className="text-center py-4 text-red-400">
          <AlertCircle className="h-5 w-5 mx-auto mb-2" />
          <p className="text-sm">{categoryError}</p>
        </div>
      );
    }

    // Get unique list of categories that actually exist in the data
    const existingCategories = [...new Set(items.map(item => item.type || "").filter(Boolean))];
    
    // Get categories with counts for sorting
    const categoryCounts = new Map<string, number>();
    existingCategories.forEach(category => {
      categoryCounts.set(category, getTypeCount(category));
    });
    
    // Sort and render filter types
    return filterTypes
      .sort((a, b) => {
        // First sort by default categories
        const aIsDefault = VALID_CATEGORIES.includes(a.id);
        const bIsDefault = VALID_CATEGORIES.includes(b.id);
        if (aIsDefault && !bIsDefault) return -1;
        if (!aIsDefault && bIsDefault) return 1;
        
        // Then sort by item count (descending)
        const aCount = categoryCounts.get(a.id) || 0;
        const bCount = categoryCounts.get(b.id) || 0;
        if (bCount !== aCount) return bCount - aCount;
        
        // Finally sort alphabetically
        return a.label.localeCompare(b.label);
      })
      .map(type => {
        const count = getTypeCount(type.id);
        const isDefault = VALID_CATEGORIES.includes(type.id);
        
        return (
          <div key={type.id} className="py-1">
            <label className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-white/5 rounded-md transition-colors group">
              <Checkbox
                id={`filter-${type.id}`}
                checked={selectedTypes.includes(type.id)}
                onCheckedChange={(checked) => handleTypeChange(type.id, checked === true)}
                className="data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
              />
              <div className="flex items-center flex-1 min-w-0">
                <span 
                  className="h-2.5 w-2.5 rounded-full mr-2 flex-shrink-0" 
                  style={{ backgroundColor: type.color }}
                />
                <span className="text-sm text-white truncate">{type.label}</span>
                {!isDefault && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteCategory(type.id);
                    }}
                    className="ml-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
                    title="Delete category"
                  >
                    <X className="h-3 w-3 text-white/60 hover:text-red-400" />
                  </button>
                )}
              </div>
              <span className="text-xs text-white/50 flex-shrink-0 min-w-[1.5rem] text-center">
                {count}
              </span>
            </label>
          </div>
        );
      });
  };

  return (
    <div className={`flex flex-col h-full overflow-hidden ${isMinimized ? 'w-16' : 'w-[260px]'} bg-[#252136] border-r border-white/10 transition-all duration-300 ease-in-out`}>
      {/* Sidebar Header - Improved design */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-white/10 bg-gradient-to-r from-[#1f1b2d] to-[#2c2640]">
        <button
          onClick={toggleSidebar}
          className={`text-white/70 hover:text-white h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105 ${
            isMinimized
              ? 'bg-gradient-to-r from-indigo-500/40 to-purple-500/40 text-white hover:from-indigo-500/60 hover:to-purple-500/60 shadow-lg shadow-indigo-500/10'
              : 'hover:bg-white/10 bg-white/5 hover:shadow-md hover:shadow-indigo-500/20'
          }`}
          title={isMinimized ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={isMinimized ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isMinimized ? (
            <PanelLeftOpen className="h-4 w-4 animate-pulse-subtle" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>

        {!isMinimized && (
          <h3 className="ml-3 text-white font-medium flex-1 truncate">Filters</h3>
        )}
      </div>
      
      {/* Create New Button */}
      <div className={`${isMinimized ? 'px-3 py-4' : 'p-6'}`}>
        <Button
          onClick={onCreateNew}
          variant="create-new"
          className="w-full group relative overflow-hidden hover:shadow-indigo-500/25"
          aria-label="Create new item"
          title={isMinimized ? "Create new item" : undefined}
        >
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -translate-x-full animate-shimmer group-hover:animate-shimmer-fast"></span>
          <div className="flex items-center justify-center gap-2">
            <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
            {!isMinimized && <span>Create New</span>}
          </div>
        </Button>
      </div>
      
      {/* Filter Label */}
      <div className={`${isMinimized ? 'flex justify-center py-3' : 'px-6 pt-4 pb-2'}`}>
        {isMinimized ? (
          <div className="text-white/70 bg-white/5 h-8 w-8 rounded-full flex items-center justify-center" title="Filters">
            <Filter className="h-4 w-4" />
          </div>
        ) : (
          <div className="text-sm text-white/90 uppercase font-medium flex items-center">
            <Filter className="w-4 h-4 mr-2 opacity-70" />
            FILTERS
            {activeFiltersCount > 0 && (
              <Badge className="ml-2 bg-indigo-500/30 text-indigo-200 font-medium text-[10px] py-0 h-5">
                {activeFiltersCount}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Search Input - Conditional based on minimized state */}
      {!isMinimized && (
        <div className="px-6 mb-4">
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
      )}

      {/* Sort Options - Only when expanded */}
      {!isMinimized && (
        <div className="px-6 mb-4">
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
      )}

      {/* Type Section - Conditionally display based on minimized state */}
      <div className={`${isMinimized ? 'px-3' : 'px-6'} flex-1 overflow-y-auto sidebar-scroll`}>
        {isMinimized ? (
          <div className="flex flex-col gap-3 items-center">
            {filterTypes.map(type => {
              const count = getTypeCount(type.id);
              if (count === 0 && selectedTypes.length > 0 && !selectedTypes.includes(type.id)) {
                return null;
              }
              const isSelected = selectedTypes.includes(type.id);
              return (
                <div 
                  key={type.id} 
                  title={`${type.label} (${count})`}
                  className={`h-9 w-9 rounded-full flex items-center justify-center cursor-pointer
                    ${isSelected ? 'ring-2 ring-white' : ''}
                    hover:scale-110 transition-all duration-200`}
                  style={{ backgroundColor: type.color }}
                  onClick={() => handleTypeChange(type.id, !isSelected)}
                >
                  {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                </div>
              );
            }).filter(Boolean)}
          </div>
        ) : (
          <div>
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
                {renderCategoryList()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom section with logout functionality */}
      <div className={`mt-auto border-t border-white/10 bg-black/20 ${isMinimized ? 'py-4 flex flex-col gap-2 items-center' : 'p-4'}`}>
        {isMinimized ? (
          <>
            
            <Button
              variant="ghost"
              size="icon"
              title="Logout"
              className="h-8 w-8 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => {
                if (window.confirm("Are you sure you want to log out?")) {
                  localStorage.removeItem('userEmail');
                  window.location.href = "/login";
                }
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <>

            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-full justify-start px-2 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => {
                if (window.confirm("Are you sure you want to log out?")) {
                  localStorage.removeItem('userEmail');
                  window.location.href = "/login";
                }
              }}
            >
              <LogOut className="h-3.5 w-3.5 mr-2" /> 
              Logout
            </Button>
          </>
        )}
      </div>
    </div>
  );
}