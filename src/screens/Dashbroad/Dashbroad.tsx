"use client"

import type React from "react"
import { useState, useEffect, useContext } from "react"
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
  Plus, Check, ArrowLeft 
} from "lucide-react"
import { createItem, updateItem, type AdminInputKnowledgeItem, fileToBase64, getCategories, VALID_CATEGORIES } from "../../lib/db"
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { CategoryPopup } from "../../components/CategoryPopup/CategoryPopup"
import { DashboardContext } from "../../App"
import { useDatabase } from "../../lib/store"
import { MapboxAutocomplete } from "../../components/MapboxAutocomplete"

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
  "Food & Drink": {
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
    date: false,
    time: false,
    address: false,
    description: false,
    price: false,
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

  const [categories, setCategories] = useState<string[]>(VALID_CATEGORIES);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(false);
  
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const fetchedCategories = await getCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error("Error fetching categories:", error);
        // Fallback to default categories in case of error
        setCategories(VALID_CATEGORIES);
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
    if (selectedCategory.name === "Create more") {
      setShowCustomNameInput(true);
      setVisibleComponents(categoryTemplates["Custom"]);
      setFormData(prev => ({ ...prev, type: "" }));  // Clear type until custom name is set
      setCustomCategoryName(""); // Clear any previous custom name
    } else {
      setFormData(prev => ({ ...prev, type: selectedCategory.name }));
      if (categoryTemplates[selectedCategory.name]) {
        setVisibleComponents(categoryTemplates[selectedCategory.name]);
      }
      setShowCustomNameInput(false); // Hide custom name input when a predefined category is selected
    }
    setShowCategoryPopup(false);
  };

  const saveCustomCategory = () => {
    if (customCategoryName.trim()) {
      setFormData(prev => ({ ...prev, type: customCategoryName }));
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

  // Rename the hardcoded categories array to categoryOptions
  const categoryOptions: Category[] = [
    { id: 1, name: "Event", icon: "/public/img/Event.png" },
    { id: 2, name: "Food & Drink", icon: "/public/img/Food & Drink.png" },
    { id: 3, name: "Accommodation", icon: "/public/img/Accommodation.png" },
    { id: 4, name: "Sightseeing Spots", icon: "/public/img/Sightseeing Spots.png" },
    { id: 5, name: "Entertainment", icon: "/public/img/Entertainment.png" },
    { id: 6, name: "FAQ", icon: "/public/img/FAQ.png" },
    { id: 7, name: "SOS assistants", icon: "/public/img/SOS assistants.png" },
    { id: 8, name: "Create more", icon: "/public/img/_Create more_.png" },
  ];

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
              className="h-9 w-9 border-white/10 bg-white/5 hover:bg-white/10 text-white"
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
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 text-white"
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
        
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 p-6 max-h-[80vh] overflow-y-auto`}>
          {/* Left column - Image upload and settings - fixed width */}
          <div className="space-y-6">
            {visibleComponents.image && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-white/70">Item Image</label>
                <div className="w-full h-80 rounded-lg overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center relative">
                  {imagePreview ? (
                    <>
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          console.error("Image failed to load:", imagePreview);
                          e.currentTarget.src = "https://placehold.co/400x400/373151/FFFFFF?text=Image+Not+Available";
                        }}
                      />
                      <Button
                        className="absolute top-2 right-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 h-8 w-8 p-0"
                        onClick={() => {
                          setImagePreview(null);
                          setFormData(prev => ({ ...prev, image: "" }));
                        }}
                        size="icon"
                        variant="outline"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <div className="text-center p-6">
                      <div className="mx-auto h-12 w-12 text-white/40 mb-4">
                        <Image className="h-12 w-12" />
                      </div>
                      <label htmlFor="image-upload" className="cursor-pointer">
                        <div className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-md transition-colors inline-flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Upload Image
                        </div>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      <p className="mt-2 text-xs text-white/40">
                        Supports JPG, PNG, GIF up to 5MB
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Type selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-white/70">Category Type</label>
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
            
            {/* Custom category name input */}
            {showCustomNameInput && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-white/70">Custom Category Name</label>
                <div className="flex gap-2">
                  <Input
                    value={customCategoryName}
                    onChange={(e) => setCustomCategoryName(e.target.value)}
                    placeholder="Enter category name"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  />
                  <Button 
                    onClick={saveCustomCategory}
                    disabled={!customCategoryName.trim()}
                    className="bg-indigo-500 text-white hover:bg-indigo-600"
                  >
                    <Check className="h-4 w-4 mr-1" /> Save
                  </Button>
                </div>
              </div>
            )}

            {/* Additional fields section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-white/70">Additional Fields</label>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <div className="text-xs text-white/40 mr-2">Toggle fields:</div>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`h-7 px-2 text-xs ${visibleComponents.date ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-white/5 text-white/70 border-white/10'}`}
                    onClick={() => toggleComponent("date")}
                  >
                    Date
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`h-7 px-2 text-xs ${visibleComponents.time ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-white/5 text-white/70 border-white/10'}`}
                    onClick={() => toggleComponent("time")}
                  >
                    Time
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`h-7 px-2 text-xs ${visibleComponents.price ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-white/5 text-white/70 border-white/10'}`}
                    onClick={() => toggleComponent("price")}
                  >
                    Price
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`h-7 px-2 text-xs ${visibleComponents.address ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-white/5 text-white/70 border-white/10'}`}
                    onClick={() => toggleComponent("address")}
                  >
                    Address
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={`h-7 px-2 text-xs ${visibleComponents.description ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-white/5 text-white/70 border-white/10'}`}
                    onClick={() => toggleComponent("description")}
                  >
                    Description
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right column - Form fields - fixed width */}
          <div className="space-y-6">
            {/* Name field */}
            {visibleComponents.name && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-white/70">Name <span className="text-red-400">*</span></label>
                <Input
                  placeholder="Enter name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-10"
                />
              </div>
            )}
            
            {/* Date field */}
            {visibleComponents.date && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-white/70">Date</label>
                <div className="relative">
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange("date", e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-10 pl-10"
                  />
                  <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                </div>
              </div>
            )}
            
            {/* Time field */}
            {visibleComponents.time && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-white/70">Time</label>
                <div className="relative">
                  <Input
                    type="time"
                    value={formData.time}
                    onChange={(e) => handleInputChange("time", e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-10 pl-10"
                  />
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                </div>
              </div>
            )}
            
            {/* Price field */}
            {visibleComponents.price && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-white/70">Price</label>
                <Input
                  placeholder="Enter price"
                  value={formData.price}
                  onChange={(e) => handleInputChange("price", e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-10"
                />
              </div>
            )}
            
            {/* Address field */}
            {visibleComponents.address && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-white/70">Address</label>
                  {locationData.lat && locationData.lng && (
                    <div className="text-xs text-indigo-400 flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      Location is set
                    </div>
                  )}
                </div>
                <MapboxAutocomplete
                  value={formData.address}
                  onChange={handleAddressChange}
                  placeholder="Search for an address"
                />
              </div>
            )}
            
            {/* Description field */}
            {visibleComponents.description && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-white/70">Description</label>
                <div className="relative">
                  <Textarea
                    placeholder="Enter description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 min-h-[120px] resize-none pl-10 pt-3"
                  />
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-white/40" />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Show category popup conditionally */}
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

