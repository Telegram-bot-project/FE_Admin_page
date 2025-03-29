"use client"

import type React from "react"
import { useState, useEffect, useContext, useMemo } from "react"
import { Button } from "../../components/ui/button"
import { Card, CardContent } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Textarea } from "../../components/ui/textarea"
import { Calendar } from "react-calendar"
import 'react-calendar/dist/Calendar.css'
import { format } from "date-fns"
import {
  CalendarIcon, Clock, Globe, Image, MapPin, X, 
  ChevronDown, FileText, Tags, Save, PlusCircleIcon, 
  Plus, Check, ArrowLeft, Info, ChevronLeft, ChevronRight, ChevronUp
} from "lucide-react"
import { createItem, updateItem, type AdminInputKnowledgeItem, fileToBase64, getCategories, getCategoriesWithDetails, VALID_CATEGORIES, addCustomCategory, getAllCategories } from "../../lib/db"
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { CategoryPopup } from "../../components/CategoryPopup/CategoryPopup"
import { DashboardContext } from "../../App"
import { useDatabase } from "../../lib/store"
import { GoogleMapsAutocomplete } from "../../components/GoogleMapsAutocomplete"

interface DashboardProps {
  onClose: () => void
  editItemId?: number | null
  onItemCreated?: (item: AdminInputKnowledgeItem) => void
  onItemUpdated?: (item: AdminInputKnowledgeItem) => void
}

interface Category {
  id: number;
  name: string;
  icon: string;
}

interface ComponentVisibility {
  name: boolean;
  date: boolean;
  time: boolean;
  address: boolean;
  description: boolean;
  price: boolean;
  image: boolean;
  [key: string]: boolean;
}

// Templates for each category type
const categoryTemplates: Record<string, ComponentVisibility> = {
  "Event": {
    name: true,
    date: true, 
    time: true,
    address: true,
    description: true,
    price: true,
    image: true
  },
  "Food & Beverage": {
    name: true,
    date: false,
    time: true,
    address: true,
    description: true,
    price: true,
    image: true
  },
  "Accommodation": {
    name: true,
    date: false,
    time: false,
    address: true,
    description: true,
    price: true,
    image: true
  },
  "Sightseeing Spots": {
    name: true,
    date: false,
    time: true,
    address: true,
    description: true,
    price: false,
    image: true
  },
  "Entertainment": {
    name: true,
    date: true,
    time: true,
    address: true,
    description: true,
    price: true,
    image: true
  },
  "FAQ": {
    name: true,
    date: false,
    time: false,
    address: false,
    description: true,
    price: false,
    image: true
  },
  "SOS assistants": {
    name: true,
    date: false,
    time: false,
    address: true,
    description: true,
    price: false,
    image: true
  },
  "Custom": {
    name: true,
    date: true,
    time: true,
    address: true,
    description: true,
    price: true,
    image: true
  }
};

export const Dashbroad = ({ 
  onClose, 
  editItemId,
  onItemCreated,
  onItemUpdated
}: DashboardProps): JSX.Element => {
  console.log("Dashbroad component mounted with editItemId:", editItemId);
  
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    description: "",
    price: "",
    time: "",
    date: "",
    type: "",
    image: ""
  });

  const [visibleComponents, setVisibleComponents] = useState<ComponentVisibility>({
    name: true,
    date: true,
    time: true,
    address: true,
    description: true,
    price: true,
    image: true
  });

  const [showCategoryPopup, setShowCategoryPopup] = useState(false);
  
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [showCustomNameInput, setShowCustomNameInput] = useState(false);
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const { setShowDashboard } = useContext(DashboardContext);
  const { addPendingCreation, addPendingUpdate } = useDatabase();
  
  const isEditMode = editItemId !== undefined && editItemId !== null;

  // Add state for location data
  const [locationData, setLocationData] = useState<{ lat?: number; lng?: number }>({});

  // Update UI layout to have more space for the map when it's displayed
  const [addressHasMap, setAddressHasMap] = useState(false);

  // Update to include custom categories
  const [categories, setCategories] = useState<string[]>(getAllCategories());
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(false);
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Add these state variables with the other useState declarations in the component
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeComponents, setTimeComponents] = useState<{
    hour: string;
    minute: string;
    period: string;
  }>({ hour: '', minute: '', period: '' });

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      try {
        // Using the original getCategories function that returns string[]
        const fetchedCategories = await getCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error("Error fetching categories:", error);
        // Fallback to default categories including custom ones
        setCategories(getAllCategories());
      } finally {
        setIsLoadingCategories(false);
      }
    };
  
    fetchCategories();
  }, []);

  useEffect(() => {
    // Clear existing data first when entering edit mode
    if (isEditMode) {
      try {
        console.log("Edit mode detected, editItemId:", editItemId);
      const storedItem = localStorage.getItem('editItem');
        console.log("Retrieved item from localStorage:", storedItem);
        
      if (storedItem) {
        const item = JSON.parse(storedItem);
          console.log("Parsed item:", item);
          
          // Log each field to help debug
          Object.keys(item).forEach(key => {
            console.log(`Item field ${key}:`, item[key]);
          });
          
          // Set form data with all available fields
        setFormData({
          name: item.name || "",
          address: item.address || "",
          description: item.description || "",
          price: item.price || "",
          time: item.time || "",
          date: item.date || "",
          type: item.type || "",
          image: item.image || ""
        });
          
          // Set image preview separately to ensure it's properly displayed
        setImagePreview(item.image || null);
          console.log("Image preview set to:", item.image);
        
          // Set visible components based on item type
          if (item.type) {
            console.log("Setting template for type:", item.type);
            if (categoryTemplates[item.type]) {
          setVisibleComponents(categoryTemplates[item.type]);
            } else {
              console.log("No template found for type:", item.type);
              setVisibleComponents({
                name: true,
                date: item.date ? true : false,
                time: item.time ? true : false,
                address: item.address ? true : false,
                description: item.description ? true : false,
                price: item.price ? true : false,
                image: true
              });
              
              // If it's a custom type but not "Create more", just set the type
              if (item.type !== "Create more") {
                setCustomCategoryName(item.type);
              }
            }
          }
        } else {
          console.error("No stored item found in localStorage");
        }
      } catch (error) {
        console.error("Error loading edit item data:", error);
      }
    }
  }, [isEditMode, editItemId]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      try {
        // Check if file is an image
        if (!file.type.match('image.*')) {
          alert('Please select an image file.');
          return;
        }
        
        // Check file size (limit to 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('Image size should not exceed 5MB.');
          return;
        }
        
        const base64Image = await fileToBase64(file);
        setFormData(prev => ({ ...prev, image: base64Image }));
        setImagePreview(base64Image);
      } catch (error) {
        console.error("Error uploading image:", error);
        alert('Failed to process the image. Please try another image.');
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatTimeRange = () => {
    if (!formData.time) return "";
    return formData.time;
  };

  const formatDate = (date: string) => {
    if (!date) return "";
    return date;
  };

  const handleCategorySelect = (selectedCategory: Category) => {
    // Immediately update the UI with the selected category type
    console.log(`Category selected: ${selectedCategory.name}`);
    
    // Update form data with the selected category type
    setFormData(prev => {
      const updated = { ...prev, type: selectedCategory.name };
      console.log("Updated form data:", updated);
      return updated;
    });
    
    // Apply the template for the selected category
    if (categoryTemplates[selectedCategory.name]) {
      setVisibleComponents(categoryTemplates[selectedCategory.name]);
    } else if (selectedCategory.name === "Create Custom") {
      // If "Create Custom" is selected, handle it differently
      setShowCustomNameInput(true);
      // Don't close the popup yet
      return;
    } else {
      // For any unknown category, make all components visible
      setVisibleComponents({
        name: true,
        date: true,
        time: true,
        address: true,
        description: true,
        price: true,
        image: true
      });
    }
    
    // Hide custom name input if a predefined category is selected
    setShowCustomNameInput(false);
    
    // Close the category popup after selection with a slight delay
    // to ensure state updates have had time to apply
    setTimeout(() => {
      setShowCategoryPopup(false);
    }, 50);
  };

  const saveCustomCategory = () => {
    if (customCategoryName.trim()) {
      // Add the custom category to global store
      addCustomCategory(customCategoryName);
      
      // Update form data
      setFormData(prev => ({ ...prev, type: customCategoryName }));
      
      // Make all components visible for custom categories
      setVisibleComponents({
        name: true,
        date: true,
        time: true,
        address: true,
        description: true,
        price: true,
        image: true
      });
      
      // Save the custom category to localStorage for persistence
      try {
        const storedCategories = localStorage.getItem('customCategories');
        const existingCategories = storedCategories ? JSON.parse(storedCategories) : [];
        
        if (!existingCategories.includes(customCategoryName)) {
          const updatedCategories = [...existingCategories, customCategoryName];
          localStorage.setItem('customCategories', JSON.stringify(updatedCategories));
          console.log(`Added custom category "${customCategoryName}" to localStorage`);
        }
        
        // Update local categories state to include the new category
        setCategories(prev => {
          if (!prev.includes(customCategoryName)) {
            return [...prev, customCategoryName];
          }
          return prev;
        });
      } catch (error) {
        console.error('Error saving custom category to localStorage:', error);
      }
      
      setShowCustomNameInput(false);
    }
  };

  const toggleComponent = (component: string) => {
    setVisibleComponents(prev => ({
      ...prev,
      [component]: !prev[component]
    }));
  };

  const addComponent = (component: string) => {
    setVisibleComponents(prev => ({
      ...prev,
      [component]: true
    }));
  };

  const handleAddressChange = (value: string, latLng?: { lat: number; lng: number }) => {
    // Update form data with the new address
    setFormData(prev => ({ ...prev, address: value }));
    
    // Store location data if available, but don't change the layout
    if (latLng) {
      setLocationData(latLng);
      // Set addressHasMap to true if we have map coordinates, 
      // but don't remove the map once it's shown
      if (!addressHasMap) {
        setAddressHasMap(true);
      }
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitError(null);
      
      // Validate required fields
      if (!formData.name) {
        setSubmitError("Please provide a name");
        return;
      }
      
      if (!formData.type) {
        setSubmitError("Please select a category");
        return;
      }

      setIsSubmitting(true);
      
      // Prepare data with required fields based on visible components
      const dataToSubmit = {
        ...formData,
        // All fields must be at least empty strings to satisfy the AdminInputKnowledgeItem type
        name: formData.name || "",
        category: formData.type || "", // Map type to category for API compatibility
        type: formData.type || "",     // Keep type for backward compatibility
        address: formData.address || "",
        description: formData.description || "",
        price: formData.price || "",
        time: formData.time || "",
        date: formData.date || "",
        // Include location data if available
        location: locationData.lat && locationData.lng ? 
          JSON.stringify({ lat: locationData.lat, lng: locationData.lng }) : 
          undefined,
        // Ensure image is either a valid string or null
        image: formData.image && typeof formData.image === 'string' ? formData.image : null
      };
      
      console.log('Preparing item for submission:', dataToSubmit);
      
      const currentEditId = isEditMode && editItemId ? editItemId : parseInt(localStorage.getItem('editItemId') || '0');
      
      // Use the Zustand store to manage pending operations
      if (isEditMode && currentEditId) {
        try {
          // Queue update using Zustand
          const itemToUpdate = { ...dataToSubmit, id: currentEditId };
          addPendingUpdate(itemToUpdate);
          console.log('Item queued for update:', itemToUpdate);
        } catch (error) {
          console.error("Error adding pending update:", error);
          setSubmitError(`Failed to queue update: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return;
        }
      } else {
        try {
          // Queue creation using Zustand
          addPendingCreation(dataToSubmit);
          console.log('Item queued for creation:', dataToSubmit);
        } catch (error) {
          console.error("Error adding pending creation:", error);
          setSubmitError(`Failed to queue creation: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return;
        }
      }
      
      // Clean up localStorage edit data
      localStorage.removeItem('editItem');
      localStorage.removeItem('editItemId');
      
      // Show success message to user
      alert(`Item successfully ${isEditMode ? 'updated' : 'created'}! Click "Update Database" to save your changes.`);
      onClose();
    } catch (error) {
      console.error("Error processing item data:", error);
      setSubmitError(`Failed to process ${isEditMode ? 'update' : 'creation'}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use effect to load stored custom categories
  useEffect(() => {
    // Load any custom categories from localStorage
    try {
      const storedCategories = localStorage.getItem('customCategories');
      if (storedCategories) {
        const customCategoriesArray = JSON.parse(storedCategories);
        // We'll use this to update the categoryOptions array below
        console.log('Loaded custom categories:', customCategoriesArray);
      }
    } catch (error) {
      console.error('Error loading custom categories from localStorage:', error);
    }
  }, []);

  // Base category options
  const baseCategoryOptions: Category[] = [
    { id: 1, name: "Event", icon: "/public/img/Event.png" },
    { id: 2, name: "Food & Beverage", icon: "/public/img/Food & Beverage.png" },
    { id: 3, name: "Accommodation", icon: "/public/img/Accommodation.png" },
    { id: 4, name: "Sightseeing Spots", icon: "/public/img/Sightseeing Spots.png" },
    { id: 5, name: "Entertainment", icon: "/public/img/Entertainment.png" },
    { id: 6, name: "FAQ", icon: "/public/img/FAQ.png" },
    { id: 7, name: "SOS assistants", icon: "/public/img/SOS assistants.png" },
  ];

  // Get any custom categories from localStorage
  const getCustomCategoryOptions = (): Category[] => {
    try {
      const storedCategories = localStorage.getItem('customCategories');
      if (storedCategories) {
        const customCategoriesArray = JSON.parse(storedCategories);
        // Generate category objects for each custom category
        return customCategoriesArray.map((name: string, index: number) => ({
          id: 100 + index, // Use high IDs to avoid conflicts
          name,
          icon: "/public/img/Custom.png" // Default icon for custom categories
        }));
      }
    } catch (error) {
      console.error('Error loading custom categories:', error);
    }
    return [];
  };

  // Combine base categories with any custom categories
  const categoryOptions: Category[] = useMemo(() => {
    const customCategories = getCustomCategoryOptions();
    
    // Combine regular categories with custom categories
    const combinedCategories = [...baseCategoryOptions, ...customCategories];
    
    return combinedCategories;
  }, []);

  // Handle close with cleanup
  const handleClose = () => {
    console.log("Dashbroad handleClose called");
    // Clean up localStorage when closing
    if (isEditMode) {
      localStorage.removeItem('editItem');
      localStorage.removeItem('editItemId');
      console.log("Cleaned up localStorage on dashboard close");
    }
    onClose();
  };

  // Add this helper function with the other utility functions
  const updateTimeFromComponents = (components: { hour: string; minute: string; period: string }) => {
    if (components.hour && components.minute && components.period) {
      const formattedTime = `${components.hour}:${components.minute} ${components.period}`;
      handleInputChange('time', formattedTime);
    }
  };

  // Add this effect to parse time when formData.time changes
  useEffect(() => {
    if (formData.time) {
      const timePattern = /(\d+):(\d+)\s*(AM|PM)/i;
      const match = formData.time.match(timePattern);
      
      if (match) {
        setTimeComponents({
          hour: match[1],
          minute: match[2],
          period: match[3].toUpperCase()
        });
      }
    }
  }, [formData.time]);

  // Add the generateCalendarDays helper function
  const generateCalendarDays = () => {
    const currentDate = formData.date ? new Date(formData.date) : new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Create new date for the first day of the month
    const firstDayOfMonth = new Date(year, month, 1);
    
    // Get the day of the week (0-6, 0 is Sunday)
    let dayOfWeek = firstDayOfMonth.getDay();
    // Adjust for Monday as first day (0 becomes Monday, 6 becomes Sunday)
    dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    // Get the last day of the month
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    
    // Get the days from the previous month
    const daysFromPrevMonth = dayOfWeek;
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();
    
    // Get the number of days to show from the next month
    const daysFromNextMonth = 42 - daysInMonth - daysFromPrevMonth;
    
    const calendarDays = [];
    
    // Add days from previous month
    for (let i = daysInPrevMonth - daysFromPrevMonth + 1; i <= daysInPrevMonth; i++) {
      calendarDays.push({
        date: new Date(year, month - 1, i),
        currentMonth: false
      });
    }
    
    // Add days from current month
    for (let i = 1; i <= daysInMonth; i++) {
      calendarDays.push({
        date: new Date(year, month, i),
        currentMonth: true
      });
    }
    
    // Add days from next month
    for (let i = 1; i <= daysFromNextMonth; i++) {
      calendarDays.push({
        date: new Date(year, month + 1, i),
        currentMonth: false
      });
    }
    
    return calendarDays;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 overflow-auto">
      <div className="bg-gradient-to-br from-[#2b2641] to-[#1a1625] w-full max-w-6xl rounded-lg shadow-2xl relative">
        {submitError && (
          <div className="absolute top-5 left-1/2 transform -translate-x-1/2 bg-red-900/50 border border-red-500/50 text-red-200 p-4 z-50 rounded shadow-lg">
            <div className="flex items-center">
              <div className="py-1">
                <svg className="w-6 h-6 mr-4 text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-bold">Error</p>
                <p>{submitError}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={handleClose}
              className="h-9 w-9 border-white/10 bg-white/5 hover:bg-white/10 text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold text-white">
              {isEditMode ? "Edit Item" : "Create New Item"}
            </h2>
          </div>
          
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            variant="gradient"
            className="px-4 py-2"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                {isEditMode ? "Save Changes" : "Create Item"}
              </div>
            )}
          </Button>
        </div>
        
        {/* Form content */}
        <div className="p-6 overflow-y-auto max-h-[calc(100vh-10rem)]">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left column */}
            <div className="space-y-6">
              {/* Item Image */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-white/70">Item Image</label>
                <div className={`relative border border-dashed border-white/20 rounded-lg ${imagePreview ? 'bg-white/5' : 'bg-white/[0.03]'} flex flex-col items-center justify-center h-[300px] overflow-hidden transition-all duration-200 hover:border-white/30`}>
                  {imagePreview ? (
                    <>
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setImagePreview(null);
                            setFormData(prev => ({ ...prev, image: "" }));
                          }}
                          className="absolute top-2 right-2 h-8 w-8 rounded-full p-0 bg-black/50 border-white/10 text-white/70 hover:text-white hover:bg-black/70"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <label className="cursor-pointer bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors">
                          <Image className="h-4 w-4" />
                          Change Image
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageUpload} 
                            className="hidden" 
                          />
                        </label>
                      </div>
                    </>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                      <div className="bg-white/5 rounded-full p-4">
                        <Image className="h-6 w-6 text-white/50" />
                      </div>
                      <span className="mt-4 text-white/70 text-sm font-medium">Upload Image</span>
                      <span className="mt-1 text-white/40 text-xs">Supports JPG, PNG, GIF up to 5MB</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload} 
                        className="hidden" 
                      />
                    </label>
                  )}
                </div>
              </div>
              
              {/* Category Type */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-white/70">Category Type <span className="text-red-400">*</span></label>
                {formData.type ? (
                  <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-md">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <Tags className="h-3 w-3 text-indigo-300" />
                      </div>
                      <span className="text-white font-medium">{formData.type}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-white/70 hover:text-white hover:bg-white/10"
                      onClick={() => setShowCategoryPopup(true)}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setShowCategoryPopup(true)}
                    className="w-full justify-between bg-white/5 border border-white/10 text-white hover:bg-white/10"
                  >
                    <span>Select Category Type</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                )}
              </div>
              
              {/* Custom category input */}
              {showCustomNameInput && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-white/70">Custom Category Name</label>
                  <div className="flex flex-col gap-4">
                    <div className="relative">
                      <Input
                        value={customCategoryName}
                        onChange={(e) => setCustomCategoryName(e.target.value)}
                        placeholder="Enter category name"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pl-10"
                      />
                      <Tags className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400" />
                    </div>
                    
                    <div className="flex flex-col space-y-3">
                      <p className="text-sm text-white/60">Custom categories allow you to define items with your own fields</p>
                      
                      <div className="bg-indigo-500/10 p-3 rounded-md border border-indigo-500/20">
                        <div className="flex items-center">
                          <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center mr-2">
                            <Info className="h-3.5 w-3.5 text-indigo-300" />
                          </div>
                          <p className="text-xs text-indigo-300">All fields will be available for this custom category</p>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={saveCustomCategory}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white w-full transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] h-11"
                      disabled={!customCategoryName.trim()}
                    >
                      <Save className="h-4 w-4 mr-2" /> Save Custom Category
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Right column */}
            <div className="space-y-6">
              {/* Name */}
              {visibleComponents.name && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-white/70">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter name"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    required
                  />
                </div>
              )}
            
              {/* Date and Time */}
              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                {visibleComponents.date && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-white/70">Date</label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="mm/dd/yyyy"
                        value={formData.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                        onClick={() => setShowDatePicker(prev => !prev)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 cursor-pointer pl-10"
                      />
                      {/* Calendar icon */}
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400">
                        <CalendarIcon className="h-4 w-4" />
                      </div>
                      
                      {/* Enhanced Date picker dropdown */}
                      {showDatePicker && (
                        <div className="absolute z-50 mt-2 w-full max-w-[350px]">
                          <div className="calendar-wrapper bg-[#1A1625] border border-white/15 rounded-lg shadow-xl overflow-hidden">
                            <div className="flex justify-between items-center p-3 bg-indigo-950/30 border-b border-white/10">
                              <button 
                                onClick={() => {
                                  const currentDate = formData.date ? new Date(formData.date) : new Date();
                                  const newDate = new Date(currentDate);
                                  newDate.setMonth(currentDate.getMonth() - 1);
                                  handleInputChange('date', `${newDate.getMonth() + 1}/${newDate.getDate()}/${newDate.getFullYear()}`);
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 transition-colors"
                                aria-label="Previous month"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <div className="text-sm font-medium text-white">
                                {formData.date 
                                  ? new Date(formData.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                                  : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                              </div>
                              <button 
                                onClick={() => {
                                  const currentDate = formData.date ? new Date(formData.date) : new Date();
                                  const newDate = new Date(currentDate);
                                  newDate.setMonth(currentDate.getMonth() + 1);
                                  handleInputChange('date', `${newDate.getMonth() + 1}/${newDate.getDate()}/${newDate.getFullYear()}`);
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 transition-colors"
                                aria-label="Next month"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                            
                            <div className="p-2">
                              {/* Weekday headers */}
                              <div className="grid grid-cols-7 mb-1">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                                  <div 
                                    key={day} 
                                    className={`text-center py-1 text-xs font-medium ${i >= 5 ? 'text-red-300/70' : 'text-white/50'}`}
                                  >
                                    {day}
                                  </div>
                                ))}
                              </div>
                              
                              {/* Calendar days - this is a simplified rendering for demonstration */}
                              <div className="grid grid-cols-7 gap-1">
                                {generateCalendarDays().map((dateObj, index) => {
                                  const isCurrentMonth = dateObj.currentMonth;
                                  const isSelected = formData.date && 
                                    new Date(formData.date).toDateString() === dateObj.date.toDateString();
                                  const isToday = new Date().toDateString() === dateObj.date.toDateString();
                                  const isWeekend = dateObj.date.getDay() === 0 || dateObj.date.getDay() === 6;
                                  
                                  return (
                                    <button
                                      key={index}
                                      onClick={() => {
                                        const date = dateObj.date;
                                        const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
                                        handleInputChange('date', formattedDate);
                                        setShowDatePicker(false);
                                      }}
                                      className={`
                                        relative h-9 rounded-full flex items-center justify-center text-sm
                                        ${!isCurrentMonth ? 'text-white/20' : isWeekend ? 'text-red-300' : 'text-white/90'} 
                                        ${isSelected 
                                          ? 'font-bold' 
                                          : isCurrentMonth ? 'hover:bg-indigo-500/20' : 'hover:bg-white/5'}
                                        transition-colors
                                      `}
                                    >
                                      {dateObj.date.getDate()}
                                      
                                      {/* Selected date highlight */}
                                      {isSelected && (
                                        <span className="absolute inset-0 rounded-full bg-indigo-600 opacity-30 z-0"></span>
                                      )}
                                      
                                      {/* Selected date dot */}
                                      {isSelected && (
                                        <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"></span>
                                      )}
                                      
                                      {/* Today indicator */}
                                      {isToday && !isSelected && (
                                        <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-indigo-400 rounded-full"></span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            
                            {/* Quick actions */}
                            <div className="border-t border-white/10 p-2 flex justify-between">
                              <button 
                                onClick={() => {
                                  const today = new Date();
                                  const formattedDate = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
                                  handleInputChange('date', formattedDate);
                                  setShowDatePicker(false);
                                }}
                                className="text-xs py-1 px-2 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 rounded-md transition-colors"
                              >
                                Today
                              </button>
                              <button 
                                onClick={() => setShowDatePicker(false)}
                                className="text-xs py-1 px-2 bg-white/5 text-white/70 hover:bg-white/10 rounded-md transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
            
                {/* Time */}
                {visibleComponents.time && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-white/70">Time</label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={formData.time}
                        onChange={(e) => handleInputChange('time', e.target.value)}
                        placeholder="--:-- --"
                        onClick={() => setShowTimePicker(prev => !prev)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 pl-10 cursor-pointer"
                      />
                      {/* Clock icon */}
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400">
                        <Clock className="h-4 w-4" />
                      </div>
                      
                      {/* Time picker dropdown */}
                      {showTimePicker && (
                        <div className="absolute z-50 mt-2 w-full max-w-[350px]">
                          <div className="time-picker-wrapper bg-[#1A1625] border border-white/15 rounded-lg shadow-xl overflow-hidden">
                            <div className="p-3 bg-indigo-950/30 border-b border-white/10">
                              <div className="text-sm font-medium text-white text-center">Set Time</div>
                            </div>
                            
                            <div className="p-4">
                              <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-1">
                                  <label className="block text-xs font-medium text-white/50 text-center mb-2">Hour</label>
                                  <div className="relative flex flex-col items-center">
                                    <button 
                                      className="bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center mb-2"
                                      onClick={() => {
                                        const hour = parseInt(timeComponents.hour || '12');
                                        const newHour = hour >= 12 ? 1 : hour + 1;
                                        setTimeComponents({...timeComponents, hour: newHour.toString().padStart(2, '0')});
                                        updateTimeFromComponents({...timeComponents, hour: newHour.toString().padStart(2, '0')});
                                      }}
                                      aria-label="Increase hour"
                                      title="Increase hour"
                                    >
                                      <ChevronUp className="h-4 w-4 text-white/70" />
                                    </button>
                                    
                                    <div className="w-full text-center bg-white/5 py-2 px-3 rounded-md text-white font-mono text-lg">
                                      {timeComponents.hour || '12'}
                                    </div>
                                    
                                    <button 
                                      className="bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center mt-2"
                                      onClick={() => {
                                        const hour = parseInt(timeComponents.hour || '12');
                                        const newHour = hour <= 1 ? 12 : hour - 1;
                                        setTimeComponents({...timeComponents, hour: newHour.toString().padStart(2, '0')});
                                        updateTimeFromComponents({...timeComponents, hour: newHour.toString().padStart(2, '0')});
                                      }}
                                      aria-label="Decrease hour"
                                      title="Decrease hour"
                                    >
                                      <ChevronDown className="h-4 w-4 text-white/70" />
                                    </button>
                                  </div>
                                </div>
                                
                                <div className="space-y-1">
                                  <label className="block text-xs font-medium text-white/50 text-center mb-2">Minute</label>
                                  <div className="relative flex flex-col items-center">
                                    <button 
                                      className="bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center mb-2"
                                      onClick={() => {
                                        const minute = parseInt(timeComponents.minute || '0');
                                        const newMinute = minute >= 55 ? 0 : minute + 5;
                                        setTimeComponents({...timeComponents, minute: newMinute.toString().padStart(2, '0')});
                                        updateTimeFromComponents({...timeComponents, minute: newMinute.toString().padStart(2, '0')});
                                      }}
                                      aria-label="Increase minute"
                                      title="Increase minute"
                                    >
                                      <ChevronUp className="h-4 w-4 text-white/70" />
                                    </button>
                                    
                                    <div className="w-full text-center bg-white/5 py-2 px-3 rounded-md text-white font-mono text-lg">
                                      {timeComponents.minute || '00'}
                                    </div>
                                    
                                    <button 
                                      className="bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center mt-2"
                                      onClick={() => {
                                        const minute = parseInt(timeComponents.minute || '0');
                                        const newMinute = minute <= 0 ? 55 : minute - 5;
                                        setTimeComponents({...timeComponents, minute: newMinute.toString().padStart(2, '0')});
                                        updateTimeFromComponents({...timeComponents, minute: newMinute.toString().padStart(2, '0')});
                                      }}
                                      aria-label="Decrease minute"
                                      title="Decrease minute"
                                    >
                                      <ChevronDown className="h-4 w-4 text-white/70" />
                                    </button>
                                  </div>
                                </div>
                                
                                <div className="space-y-1">
                                  <label className="block text-xs font-medium text-white/50 text-center mb-2">AM/PM</label>
                                  <div className="flex flex-col h-full justify-center gap-3">
                                    <button 
                                      className={`py-2 rounded-md text-center font-medium text-sm ${
                                        timeComponents.period === 'AM' 
                                          ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30' 
                                          : 'bg-white/5 text-white/70 hover:bg-white/10'
                                      }`}
                                      onClick={() => {
                                        setTimeComponents({...timeComponents, period: 'AM'});
                                        updateTimeFromComponents({...timeComponents, period: 'AM'});
                                      }}
                                    >
                                      AM
                                    </button>
                                    
                                    <button 
                                      className={`py-2 rounded-md text-center font-medium text-sm ${
                                        timeComponents.period === 'PM' 
                                          ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30' 
                                          : 'bg-white/5 text-white/70 hover:bg-white/10'
                                      }`}
                                      onClick={() => {
                                        setTimeComponents({...timeComponents, period: 'PM'});
                                        updateTimeFromComponents({...timeComponents, period: 'PM'});
                                      }}
                                    >
                                      PM
                                    </button>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Time presets */}
                              <div className="mt-4 border-t border-white/10 pt-3">
                                <div className="text-xs font-medium text-white/50 mb-2">Quick Select:</div>
                                <div className="grid grid-cols-4 gap-2">
                                  {['9:00 AM', '12:00 PM', '3:00 PM', '6:00 PM'].map(time => (
                                    <button 
                                      key={time}
                                      className={`py-1 px-2 text-xs rounded ${
                                        formData.time === time 
                                          ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30' 
                                          : 'bg-white/5 text-white/70 hover:bg-white/10'
                                      }`}
                                      onClick={() => {
                                        handleInputChange('time', time);
                                        setShowTimePicker(false);
                                      }}
                                    >
                                      {time}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="border-t border-white/10 p-2 flex justify-between">
                              <button 
                                onClick={() => {
                                  handleInputChange('time', '');
                                  setTimeComponents({ hour: '', minute: '', period: '' });
                                  setShowTimePicker(false);
                                }}
                                className="text-xs py-1 px-2 bg-white/5 text-white/70 hover:bg-white/10 rounded-md transition-colors"
                              >
                                Clear
                              </button>
                              <button 
                                onClick={() => setShowTimePicker(false)}
                                className="text-xs py-1 px-2 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 rounded-md transition-colors"
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            
              {/* Price */}
              {visibleComponents.price && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-white/70">Price</label>
                  <Input
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    placeholder="Enter price"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
              )}
            
              {/* Address */}
              {visibleComponents.address && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-white/70">Address</label>
                  <div className="transition-all duration-200">
                    <GoogleMapsAutocomplete
                      value={formData.address}
                      onChange={handleAddressChange}
                      placeholder="Search for an address"
                      showMap={addressHasMap}
                    />
                  </div>
                </div>
              )}
            
              {/* Description */}
              {visibleComponents.description && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-white/70">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter description"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[120px]"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Category selection popup */}
        {showCategoryPopup && (
          <CategoryPopup
            categories={categoryOptions}
            isOpen={showCategoryPopup}
            onClose={() => setShowCategoryPopup(false)}
            onSelectCategory={handleCategorySelect}
          />
        )}
      </div>
    </div>
  );
};

