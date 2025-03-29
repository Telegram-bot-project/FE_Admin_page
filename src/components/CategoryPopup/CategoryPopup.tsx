import React, { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { X, Plus, Grid, Info, Tag, AlertCircle, FileIcon, Trash } from 'lucide-react';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { createCategory, type CategoryCreateInput, removeCustomCategory, VALID_CATEGORIES, deleteCategory } from '../../lib/db';

interface Category {
  id: number;
  name: string;
  icon: string;
  description?: string;
}

interface CategoryPopupProps {
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (category: Category) => void;
}

// Define category colors - expanded with better color handling for custom categories
const categoryColors: Record<string, { bg: string, shadow: string, iconBg: string, textColor: string }> = {
  "Event": { bg: "bg-emerald-500", shadow: "shadow-emerald-500/20", iconBg: "bg-emerald-500/20", textColor: "text-emerald-300" },
  "Food & Beverage": { bg: "bg-amber-500", shadow: "shadow-amber-500/20", iconBg: "bg-amber-500/20", textColor: "text-amber-300" },
  "Accommodation": { bg: "bg-indigo-500", shadow: "shadow-indigo-500/20", iconBg: "bg-indigo-500/20", textColor: "text-indigo-300" },
  "Sightseeing Spots": { bg: "bg-purple-500", shadow: "shadow-purple-500/20", iconBg: "bg-purple-500/20", textColor: "text-purple-300" },
  "Entertainment": { bg: "bg-green-500", shadow: "shadow-green-500/20", iconBg: "bg-green-500/20", textColor: "text-green-300" },
  "FAQ": { bg: "bg-blue-500", shadow: "shadow-blue-500/20", iconBg: "bg-blue-500/20", textColor: "text-blue-300" },
  "SOS assistants": { bg: "bg-red-500", shadow: "shadow-red-500/20", iconBg: "bg-red-500/20", textColor: "text-red-300" },
  "Tips": { bg: "bg-pink-500", shadow: "shadow-pink-500/20", iconBg: "bg-pink-500/20", textColor: "text-pink-300" },
  "Contact": { bg: "bg-rose-500", shadow: "shadow-rose-500/20", iconBg: "bg-rose-500/20", textColor: "text-rose-300" },
  "Create more": { bg: "bg-slate-500", shadow: "shadow-slate-500/20", iconBg: "bg-slate-500/20", textColor: "text-slate-300" },
};

// Generate a color based on the category name - for custom categories
const generateCategoryColor = (name: string) => {
  // Simple hash function to generate a consistent numeric value from a string
  const hash = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Array of vibrant colors for custom categories
  const colors = [
    { bg: "bg-teal-500", shadow: "shadow-teal-500/20", iconBg: "bg-teal-500/20", textColor: "text-teal-300" },
    { bg: "bg-cyan-500", shadow: "shadow-cyan-500/20", iconBg: "bg-cyan-500/20", textColor: "text-cyan-300" },
    { bg: "bg-sky-500", shadow: "shadow-sky-500/20", iconBg: "bg-sky-500/20", textColor: "text-sky-300" },
    { bg: "bg-fuchsia-500", shadow: "shadow-fuchsia-500/20", iconBg: "bg-fuchsia-500/20", textColor: "text-fuchsia-300" },
    { bg: "bg-violet-500", shadow: "shadow-violet-500/20", iconBg: "bg-violet-500/20", textColor: "text-violet-300" },
    { bg: "bg-lime-500", shadow: "shadow-lime-500/20", iconBg: "bg-lime-500/20", textColor: "text-lime-300" },
    { bg: "bg-orange-500", shadow: "shadow-orange-500/20", iconBg: "bg-orange-500/20", textColor: "text-orange-300" }
  ];
  
  // Use the hash to select a color from the array
  return colors[hash % colors.length];
};

export const CategoryPopup: React.FC<CategoryPopupProps> = ({
  categories,
  isOpen,
  onClose,
  onSelectCategory
}) => {
  const [animateIn, setAnimateIn] = useState(false);
  const [categoryTemplates, setCategoryTemplates] = useState<Record<string, string[]>>({});
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState<CategoryCreateInput>({
    name: '',
    description: ''
  });
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [customCategoryDescription, setCustomCategoryDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ name: '' });
  
  // State to hold categories after potential deletions
  const [displayedCategories, setDisplayedCategories] = useState<Category[]>(categories);
  
  // Update displayedCategories when categories prop changes
  useEffect(() => {
    setDisplayedCategories(categories);
  }, [categories]);
  
  // Check if a category is a default category
  const isDefaultCategory = (categoryName: string): boolean => {
    return VALID_CATEGORIES.includes(categoryName);
  };
  
  // Handle deleting a custom category
  const handleDeleteCategory = async (e: React.MouseEvent, categoryId: number, categoryName: string) => {
    e.stopPropagation(); // Prevent category selection when clicking delete
    
    if (isDefaultCategory(categoryName)) {
      setError("Default categories cannot be deleted");
      return;
    }
    
    if (confirm(`Are you sure you want to delete the "${categoryName}" category?`)) {
      try {
        setIsLoading(true);
        
        // Remove from local state first for immediate UI feedback
        setDisplayedCategories(prev => prev.filter(cat => cat.id !== categoryId));
        
        // Call the API to delete the category
        try {
          await deleteCategory(categoryId);
          // If successful, also remove from local custom categories
          removeCustomCategory(categoryName);
        } catch (error) {
          console.error("Error deleting category from API:", error);
          // Still remove from local storage even if API fails
          removeCustomCategory(categoryName);
        }
        
        // Success notification
        console.log(`Category "${categoryName}" deleted successfully`);
      } catch (error) {
        console.error("Error deleting category:", error);
        setError(`Failed to delete category: ${error instanceof Error ? error.message : String(error)}`);
        // Restore the category in UI
        setDisplayedCategories(categories);
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Delay the animation slightly for better visual effect
      const timer = setTimeout(() => {
        setAnimateIn(true);
      }, 50);
      
      // Prepare template information for display - make sure these match the actual templates used in Dashbroad.tsx
      const templates: Record<string, string[]> = {
        "Event": ["Name", "Date", "Time", "Address", "Description", "Price", "Image"],
        "Food & Beverage": ["Name", "Time", "Address", "Description", "Price", "Image"],
        "Accommodation": ["Name", "Address", "Description", "Price", "Image"],
        "Sightseeing Spots": ["Name", "Time", "Address", "Description", "Image"],
        "Entertainment": ["Name", "Date", "Time", "Address", "Description", "Price", "Image"],
        "FAQ": ["Name", "Description", "Image"],
        "SOS assistants": ["Name", "Address", "Description", "Image"],
      };
      
      // Add custom categories with default fields
      categories.forEach(category => {
        if (!templates[category.name]) {
          templates[category.name] = ["Name", "Description", "Custom fields"];
        }
      });
      
      setCategoryTemplates(templates);
      return () => clearTimeout(timer);
    } else {
      setAnimateIn(false);
    }
  }, [isOpen, categories]);

  const handleCreateCategory = async () => {
    // Reset errors
    setErrors({ name: '' });
    
    // Validate input
    if (!customCategoryName.trim()) {
      setErrors({ name: 'Category name is required' });
      return;
    }
    
    // Check if category name already exists
    const categoryExists = categories.some(
      cat => cat.name.toLowerCase() === customCategoryName.toLowerCase()
    );
    
    if (categoryExists) {
      setErrors({ name: 'A category with this name already exists' });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create a new category
      const newCategory: Category = {
        // Generate a temporary ID - the backend will assign a proper one
        id: Date.now(), // Use a number for ID
        name: customCategoryName,
        icon: '/img/custom-category-placeholder.png', // Default placeholder icon
        description: customCategoryDescription
      };
      
      // Try to load categories from the parent component
      onSelectCategory(newCategory);
      
      // Clear form
      setCustomCategoryName('');
      setCustomCategoryDescription('');
      setShowCustomForm(false);
      
      // TODO: In a real implementation, you would call your API here
      // await createCategory(newCategory);
    } catch (error) {
      console.error("Error creating category:", error);
      // Handle error (show message, etc.)
    } finally {
      setIsLoading(false);
    }
  };

  const renderCategoryImage = (cat: Category) => {
    // For empty icon or placeholder detection
    const isPlaceholderOrEmpty = !cat.icon || cat.icon.includes('placeholder') || cat.icon === '';
    
    if (isPlaceholderOrEmpty) {
      // Use the first letter of the category name as a fallback
      const letter = cat.name.charAt(0).toUpperCase();
      return (
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
          <span className="text-white text-lg font-semibold">{letter}</span>
        </div>
      );
    }
    
    // For image URLs, handle loading and errors
    return (
      <div className="h-10 w-10 rounded-full flex items-center justify-center overflow-hidden">
        <img 
          src={cat.icon.replace("/public", "")} 
          alt={cat.name} 
          className="h-10 w-10 object-cover"
          onError={(e) => {
            // If image fails to load, show the first letter of the category name
            e.currentTarget.style.display = 'none';
            const fallbackDiv = e.currentTarget.parentNode as HTMLDivElement;
            if (fallbackDiv) {
              fallbackDiv.classList.add("bg-gradient-to-br", "from-indigo-500", "to-purple-600");
              fallbackDiv.innerHTML = `<span class="text-white text-lg font-semibold">${cat.name.charAt(0).toUpperCase()}</span>`;
            }
          }}
        />
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:items-end pointer-events-none">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-300 ease-in-out ${
          animateIn ? 'opacity-70' : 'opacity-0'
        } pointer-events-auto`}
        onClick={onClose}
      />
      
      {/* Popup content */}
      <div 
        className={`relative w-full max-w-5xl bg-gradient-to-b from-[#252136] to-[#1c192a] border border-white/10 rounded-t-xl shadow-2xl transition-all duration-300 ease-in-out ${
          animateIn ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-95 opacity-0'
        } pointer-events-auto sm:rounded-xl sm:mb-6 max-h-[90vh] overflow-auto`}
      >
        <div className="container mx-auto p-6 relative">
          {/* Close button */}
          <Button 
            variant="outline" 
            size="icon" 
            className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-white/10 text-white/70 hover:text-white border-white/10 bg-white/5 transition-all duration-200 hover:scale-105"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
          
          {/* Category header */}
          <div className="flex items-center mb-8">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center mr-3 shadow-md shadow-indigo-500/10">
              <Grid className="h-5 w-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-white text-xl font-semibold">
                {showCustomForm ? 'Create New Category' : 'Select Category'}
              </h3>
              <p className="text-white/60 text-sm">Choose a template for your item</p>
            </div>
          </div>
          
          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-md text-red-200 text-sm flex items-start">
              <AlertCircle className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {showCustomForm ? (
            // Show custom category form
            <div className="mt-6 p-6 bg-gradient-to-r from-slate-800/80 to-slate-900/80 rounded-xl border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium text-lg">Create Custom Category</h3>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowCustomForm(false)}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="categoryName" className="text-white text-sm block mb-2">
                    Category Name
                  </label>
                  <Input
                    id="categoryName"
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                    placeholder="Enter category name"
                    className="bg-white/5 border-white/10 text-white"
                  />
                  {errors.name && (
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.name}
                    </p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="categoryDescription" className="text-white text-sm block mb-2">
                    Description (Optional)
                  </label>
                  <Textarea
                    id="categoryDescription"
                    value={customCategoryDescription}
                    onChange={(e) => setCustomCategoryDescription(e.target.value)}
                    placeholder="Enter a description for this category"
                    className="bg-white/5 border-white/10 text-white min-h-[80px]"
                  />
                </div>
                
                <div className="flex justify-end mt-6 gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => setShowCustomForm(false)}
                    className="text-white/70 hover:text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateCategory}
                    className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-none"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="animate-pulse">Creating...</span>
                      </>
                    ) : (
                      "Create Category"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Category grid
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
                {/* Render all categories in a consistent grid */}
                {displayedCategories.map((category) => {
                  const isCustomCategory = !isDefaultCategory(category.name);
                  const colorStyle = isCustomCategory 
                    ? generateCategoryColor(category.name) 
                    : (categoryColors[category.name] || { bg: "bg-gray-700", shadow: "shadow-gray-800/50", textColor: "text-white" });
                  
                  return (
                    <div 
                      key={category.id} 
                      className={`p-4 rounded-lg cursor-pointer hover:bg-white/5 transition-all duration-200 flex flex-col items-center text-center relative group`}
                      onClick={() => onSelectCategory(category)}
                    >
                      {/* Add delete button for custom categories */}
                      {isCustomCategory && (
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500/80 hover:bg-red-500 text-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                          onClick={(e) => handleDeleteCategory(e, category.id, category.name)}
                          aria-label={`Delete ${category.name} category`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                      
                      <div 
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center ${colorStyle.bg} ${colorStyle.shadow} shadow-lg mb-3`}
                      >
                        {renderCategoryImage(category)}
                      </div>
                      <span className={`${colorStyle.textColor} text-sm font-medium`}>
                        {category.name}
                        {isCustomCategory && (
                          <span className="ml-1 text-xs text-white/40">(custom)</span>
                        )}
                      </span>
                    </div>
                  );
                })}

                {/* Create Custom button */}
                <div 
                  className="p-4 rounded-lg cursor-pointer hover:bg-white/5 transition-all duration-200 flex flex-col items-center text-center"
                  onClick={() => setShowCustomForm(true)}
                >
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-600/20 mb-3">
                    <Plus className="w-8 h-8 text-white" />
                  </div>
                  <span className="text-purple-300 text-sm font-medium">Create Custom</span>
                </div>
              </div>

              {/* Template descriptions */}
              <div className="bg-white/5 rounded-xl p-5 border border-white/10 mt-6">
                <div className="flex items-center mb-4">
                  <Info className="h-4 w-4 text-indigo-300 mr-2" />
                  <h4 className="text-white text-sm font-medium">Template Fields</h4>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Object.entries(categoryTemplates)
                    .sort(([a], [b]) => a.localeCompare(b)) // Sort by category name for consistent display
                    .map(([catName, fields]) => {
                      const isCustomCategory = !categoryColors[catName];
                      const colorStyle = isCustomCategory 
                        ? generateCategoryColor(catName) 
                        : (categoryColors[catName] || { textColor: "text-white" });
                      
                      return (
                        <div key={catName} className="bg-white/5 p-3 rounded-md border border-white/10 transition-all duration-200 hover:bg-white/10 hover:border-white/20">
                          <span className={`${colorStyle.textColor} font-medium block mb-1 text-sm`}>{catName}</span>
                          <span className="text-white/70 text-xs">
                            {fields.length > 0 ? fields.join(", ") : "No fields defined"}
                          </span>
                        </div>
                      );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Bottom handle for mobile */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-12 h-1.5 bg-white/20 rounded-full mb-1"></div>
        </div>
      </div>
    </div>
  );
}; 