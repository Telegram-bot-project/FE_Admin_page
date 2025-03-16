import React, { useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { X, Plus, Grid, Info } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  icon: string;
}

interface CategoryPopupProps {
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (category: Category) => void;
}

// Define category colors
const categoryColors: Record<string, { bg: string, shadow: string }> = {
  "Event": { bg: "bg-emerald-500", shadow: "shadow-emerald-500/20" },
  "Food & Drink": { bg: "bg-amber-500", shadow: "shadow-amber-500/20" },
  "Accommodation": { bg: "bg-indigo-500", shadow: "shadow-indigo-500/20" },
  "Sightseeing Spots": { bg: "bg-purple-500", shadow: "shadow-purple-500/20" },
  "Entertainment": { bg: "bg-green-500", shadow: "shadow-green-500/20" },
  "Tips": { bg: "bg-red-500", shadow: "shadow-red-500/20" },
  "Contact": { bg: "bg-pink-500", shadow: "shadow-pink-500/20" },
  "Create more": { bg: "bg-slate-500", shadow: "shadow-slate-500/20" },
};

export const CategoryPopup: React.FC<CategoryPopupProps> = ({
  categories,
  isOpen,
  onClose,
  onSelectCategory
}) => {
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Delay the animation slightly for better visual effect
      const timer = setTimeout(() => {
        setAnimateIn(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setAnimateIn(false);
    }
  }, [isOpen]);

  useEffect(() => {
    // Log categories to help debug
    if (isOpen && categories?.length) {
      console.log('Categories:', categories);
    }
  }, [isOpen, categories]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-300 ease-in-out ${
          animateIn ? 'opacity-60' : 'opacity-0'
        } pointer-events-auto`}
        onClick={onClose}
      />
      
      {/* Popup content */}
      <div 
        className={`relative w-full max-w-5xl bg-gradient-to-b from-[#252136] to-[#1c192a] border-t border-white/10 rounded-t-xl shadow-2xl transition-transform duration-300 ease-in-out ${
          animateIn ? 'translate-y-0' : 'translate-y-full'
        } pointer-events-auto`}
      >
        <div className="container mx-auto p-6 relative">
          {/* Close button */}
          <Button 
            variant="outline" 
            size="icon" 
            className="absolute top-4 right-4 h-8 w-8 rounded-md hover:bg-white/10 text-white/70 hover:text-white border-white/10 bg-white/5"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          
          {/* Category header */}
          <div className="flex items-center mb-8">
            <div className="w-9 h-9 bg-indigo-500/20 rounded-lg flex items-center justify-center mr-3">
              <Grid className="h-5 w-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-white text-xl font-semibold">Select Category</h3>
              <p className="text-white/60 text-sm">Choose a template for your item</p>
            </div>
          </div>
          
          {/* Categories grid */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            {categories.map((category) => {
              const colorStyle = categoryColors[category.name] || { bg: "bg-gray-500", shadow: "shadow-gray-500/20" };
              
              return (
                <div 
                  key={category.id} 
                  className="flex flex-col items-center cursor-pointer group"
                  onClick={() => onSelectCategory(category)}
                >
                  <div className="mb-3 relative transform transition-transform duration-200 group-hover:scale-105">
                    <div 
                      className={`w-16 h-16 rounded-xl flex items-center justify-center ${colorStyle.bg} ${colorStyle.shadow} shadow-lg`}
                    >
                      {category.name === "Create more" ? (
                        <Plus className="w-8 h-8 text-white" />
                      ) : (
                        <img 
                          src={category.icon} 
                          alt={category.name}
                          className="w-10 h-10 object-contain"
                          onError={(e) => {
                            console.error(`Error loading image: ${category.icon}`);
                            // Show a fallback icon based on the category name's first letter
                            e.currentTarget.style.display = 'none';
                            const div = e.currentTarget.parentElement;
                            if (div) {
                              div.innerHTML = `<span class="text-white text-xl font-bold">${category.name.charAt(0)}</span>`;
                            }
                          }}
                        />
                      )}
                    </div>
                  </div>
                  <span className="text-white group-hover:text-indigo-300 text-sm font-medium text-center transition-colors">
                    {category.name}
                  </span>
                  {category.name === "Create more" && (
                    <span className="text-white/50 text-xs text-center mt-1">
                      Custom fields
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Template descriptions */}
          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <div className="flex items-center mb-4">
              <Info className="h-4 w-4 text-indigo-300 mr-2" />
              <h4 className="text-white text-sm font-medium">Template Fields</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/5 p-3 rounded-md border border-white/10">
                <span className="text-indigo-300 font-medium block mb-1 text-sm">Event</span>
                <span className="text-white/70 text-xs">Name, Date, Time, Address, Description, Price</span>
              </div>
              <div className="bg-white/5 p-3 rounded-md border border-white/10">
                <span className="text-amber-300 font-medium block mb-1 text-sm">Food & Drink</span>
                <span className="text-white/70 text-xs">Name, Time, Address, Description, Price</span>
              </div>
              <div className="bg-white/5 p-3 rounded-md border border-white/10">
                <span className="text-indigo-300 font-medium block mb-1 text-sm">Accommodation</span>
                <span className="text-white/70 text-xs">Name, Address, Description, Price</span>
              </div>
              <div className="bg-white/5 p-3 rounded-md border border-white/10">
                <span className="text-purple-300 font-medium block mb-1 text-sm">Sightseeing</span>
                <span className="text-white/70 text-xs">Name, Time, Address, Description</span>
              </div>
              <div className="bg-white/5 p-3 rounded-md border border-white/10">
                <span className="text-green-300 font-medium block mb-1 text-sm">Entertainment</span>
                <span className="text-white/70 text-xs">Name, Date, Time, Address, Description, Price</span>
              </div>
              <div className="bg-white/5 p-3 rounded-md border border-white/10">
                <span className="text-red-300 font-medium block mb-1 text-sm">Tips</span>
                <span className="text-white/70 text-xs">Name, Description</span>
              </div>
              <div className="bg-white/5 p-3 rounded-md border border-white/10">
                <span className="text-pink-300 font-medium block mb-1 text-sm">Contact</span>
                <span className="text-white/70 text-xs">Name, Address, Description</span>
              </div>
              <div className="bg-white/5 p-3 rounded-md border border-white/10">
                <span className="text-white font-medium block mb-1 text-sm">Create more</span>
                <span className="text-white/70 text-xs">Custom fields (add what you need)</span>
              </div>
            </div>
          </div>

          {/* Bottom handle for mobile */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-12 h-1 bg-white/20 rounded-full mb-1"></div>
        </div>
      </div>
    </div>
  );
}; 