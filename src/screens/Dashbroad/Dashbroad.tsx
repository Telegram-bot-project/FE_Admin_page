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
  Plus, Check, ArrowLeft, Info, ChevronLeft, ChevronRight, ChevronUp, DollarSign
} from "lucide-react"
import { createItem, updateItem, type AdminInputKnowledgeItem, fileToBase64, getCategories, getCategoriesWithDetails, VALID_CATEGORIES, addCustomCategory, getAllCategories } from "../../lib/db"
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { CategoryPopup } from "../../components/CategoryPopup/CategoryPopup"
import { DashboardContext } from "../../App"
import { useDatabase } from "../../lib/store"
import { GoongMapsAutocomplete } from "../../components/maps"

interface DashboardProps {
  onClose: () => void
  editItemId?: number | null
  onItemCreated?: (item: AdminInputKnowledgeItem) => void
  onItemUpdated?: (item: AdminInputKnowledgeItem) => void
}

interface Ticket {
  id: string;
  name: string;
  price: string;
  currency: string;
}

interface PriceRange {
  min: string;
  max: string;
  currency: string;
}

interface Category {
  id: number;
  name: string;
  icon: string;
}

interface ComponentVisibility {
  name: boolean;
  date: boolean;
  endDate: boolean;
  time: boolean;
  endTime: boolean;
  address: boolean;
  description: boolean;
  tickets: boolean;
  priceRange: boolean;
  image: boolean;
  [key: string]: boolean;
}

// Templates for each category type
const categoryTemplates: Record<string, ComponentVisibility> = {
  "Event": {
    name: true,
    date: true, 
    endDate: true,
    time: true,
    endTime: true,
    address: true,
    description: true,
    tickets: true,
    priceRange: false,
    image: true
  },
  "Food & Beverage": {
    name: true,
    date: false,
    endDate: false,
    time: true,
    endTime: true,
    address: true,
    description: true,
    tickets: false,
    priceRange: true,
    image: true
  },
  "Accommodation": {
    name: true,
    date: false,
    endDate: false,
    time: false,
    endTime: false,
    address: true,
    description: true,
    tickets: false,
    priceRange: true,
    image: true
  },
  "Sightseeing Spots": {
    name: true,
    date: false,
    endDate: false,
    time: true,
    endTime: false,
    address: true,
    description: true,
    tickets: false,
    priceRange: false,
    image: true
  },
  "Entertainment": {
    name: true,
    date: true,
    endDate: true,
    time: true,
    endTime: true,
    address: true,
    description: true,
    tickets: true,
    priceRange: false,
    image: true
  },
  "FAQ": {
    name: true,
    date: false,
    endDate: false,
    time: false,
    endTime: false,
    address: false,
    description: true,
    tickets: false,
    priceRange: false,
    image: true
  },
  "SOS assistants": {
    name: true,
    date: false,
    endDate: false,
    time: false,
    endTime: false,
    address: true,
    description: true,
    tickets: false,
    priceRange: false,
    image: true
  },
  "Custom": {
    name: true,
    date: true,
    endDate: true,
    time: true,
    endTime: true,
    address: true,
    description: true,
    tickets: true,
    priceRange: false,
    image: true
  }
};

// Helper function to determine if a category uses price range instead of tickets
const usePriceRange = (categoryType: string): boolean => {
  return categoryType === "Food & Beverage" || categoryType === "Accommodation";
};

// Helper function to determine if a category uses tickets
const useTickets = (categoryType: string): boolean => {
  return categoryType === "Event" || categoryType === "Entertainment";
};

// Add this function before the return statement to handle ticket parsing

// Add a simplified interface that matches what we need
interface TicketItem {
  id?: string;
  name?: string;
  price?: string;
  currency?: string;
}

// Update the function to use the inline interface
// Helper function to parse tickets from various formats
const parseTicketsFromItem = (item: any): Ticket[] => {
  let parsedTickets: any[] = [];
  
  console.log("Parsing tickets from item:", item);
  
  // Check if item has tickets field
  if (item.tickets) {
    try {
      // Try to parse tickets from JSON string
      if (typeof item.tickets === 'string') {
        try {
          console.log("Attempting to parse tickets JSON:", item.tickets);
          parsedTickets = JSON.parse(item.tickets);
          console.log("Successfully parsed tickets from JSON:", parsedTickets);
          
          // Ensure the parsed data is an array
          if (!Array.isArray(parsedTickets)) {
            console.warn("Parsed tickets is not an array, converting to array");
            if (parsedTickets && typeof parsedTickets === 'object') {
              // Single ticket object
              parsedTickets = [parsedTickets];
            } else {
              // Invalid data
              parsedTickets = [];
            }
          }
        } catch (parseError) {
          console.error("Failed to parse tickets as JSON:", parseError);
          // Default to empty array
          parsedTickets = [];
          
          // If that fails, check if it's using our custom format with parentheses
          if (item.tickets.includes('(') && item.tickets.includes('|')) {
            console.log("Attempting to parse tickets from custom format");
            const lines = item.tickets.split('\n');
            console.log("Ticket lines:", lines);
            
            parsedTickets = lines.map((line: string) => {
              const match = line.match(/\(([^|]+)\|([^|]+)\|([^)]+)\)/);
              if (match) {
                const ticket = {
                  id: `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  name: match[1].trim() || 'Ticket',
                  price: match[2].trim() || '',
                  currency: match[3].trim() || 'USD'
                };
                console.log("Parsed ticket:", ticket);
                return ticket;
              }
              console.warn("Failed to parse line:", line);
              return null;
            }).filter(Boolean);
            
            console.log("Final tickets parsed from custom format:", parsedTickets);
          }
        }
      } else if (Array.isArray(item.tickets)) {
        parsedTickets = item.tickets;
        console.log("Using tickets array directly:", parsedTickets);
      } else if (typeof item.tickets === 'object' && item.tickets !== null) {
        // Single ticket as object
        parsedTickets = [item.tickets];
        console.log("Using single ticket object as array:", parsedTickets);
      }
    } catch (err) {
      console.error("Error parsing tickets:", err);
      parsedTickets = [];
    }
  }
  
  // Also check price field for ticket formatting if no tickets were found
  if ((!Array.isArray(parsedTickets) || parsedTickets.length === 0) && 
      item.price && typeof item.price === 'string') {
    console.log("Checking price field for ticket data:", item.price);
    
    // Check for our custom format in the price field
    if (item.price.includes('(') && item.price.includes('|')) {
      console.log("Price contains formatted ticket data");
      const ticketLines = item.price.split('\n');
      parsedTickets = ticketLines.map((line: string) => {
        const match = line.match(/\(([^|]+)\|([^|]+)\|([^)]+)\)/);
        if (match) {
          return {
            id: `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: match[1].trim() || 'Ticket',
            price: match[2].trim() || '',
            currency: match[3].trim() || 'USD'
          };
        }
        return null;
      }).filter(Boolean);
      
      console.log("Parsed tickets from price field:", parsedTickets);
    } else {
      // Try to parse regular price
      const priceParts = item.price.split(' ');
      if (priceParts.length > 0) {
        parsedTickets = [{
          id: `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: "General Admission",
          price: priceParts[0] || "0",
          currency: priceParts[1] || "USD"
        }];
        console.log("Created single ticket from price:", parsedTickets);
      }
    }
  }
  
  // Ensure all tickets have required fields and match the Ticket interface
  const validTickets = (Array.isArray(parsedTickets) ? parsedTickets : [])
    .filter((ticket: any) => ticket !== null && ticket !== undefined)
    .map((ticket: any) => ({
      id: ticket?.id || `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: ticket?.name || "General Admission", 
      price: ticket?.price || "0",
      currency: ticket?.currency || "USD"
    })) as Ticket[];
  
  console.log("Final parsed tickets:", validTickets);
  
  // If no tickets were parsed, create a default one
  if (validTickets.length === 0) {
    console.log("No valid tickets found, creating default ticket");
    return [{
      id: `ticket-default-${Date.now()}`,
      name: "General Admission",
      price: "0",
      currency: "USD"
    }];
  }
  
  return validTickets;
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
    time: "",
    endTime: "",
    date: "",
    endDate: "",
    type: "",
    image: ""
  });

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [priceRange, setPriceRange] = useState<PriceRange>({
    min: "",
    max: "",
    currency: "USD"
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [currencies, setCurrencies] = useState<string[]>([
    "USD", "EUR", "JPY", "GBP", "AUD", "CAD", "CHF", "CNY", "VND", "USDT", "USDC", "Other"
  ]);

  const [visibleComponents, setVisibleComponents] = useState<ComponentVisibility>({
    name: true,
    date: true,
    endDate: true,
    time: true,
    endTime: true,
    address: true,
    description: true,
    tickets: true,
    priceRange: false,
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

  // Add a new state for the end date picker
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  // Add a new state for the end time picker  
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [endTimeComponents, setEndTimeComponents] = useState<{
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
          
          // Parse date range if present
          let startDate = "";
          let endDate = "";
          let startTime = "";
          let endTime = "";

          // Handle single date or date range
          if (item.date) {
            // Check if it's a date range (format: "MM/DD/YYYY - MM/DD/YYYY")
            const dateRangeMatch = item.date.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s*-\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
            if (dateRangeMatch) {
              startDate = dateRangeMatch[1];
              endDate = dateRangeMatch[2];
            } else {
              // Single date
              startDate = item.date;
            }
          }

          // Handle single time or time range
          if (item.time) {
            // Check if it's a time range (format: "HH:MM AM/PM - HH:MM AM/PM")
            const timeRangeMatch = item.time.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
            if (timeRangeMatch) {
              startTime = timeRangeMatch[1];
              endTime = timeRangeMatch[2];
            } else {
              // Single time
              startTime = item.time;
            }
          }

          // Individual date/time fields take precedence if they exist
          startDate = item.startDate || startDate;
          endDate = item.endDate || endDate;
          startTime = item.startTime || startTime;
          endTime = item.endTime || endTime;
          
          // Set form data with all available fields
        setFormData({
          name: item.name || "",
          address: item.address || "",
          description: item.description || "",
            time: startTime,
            endTime: endTime,
            date: startDate,
            endDate: endDate,
          type: item.type || "",
          image: item.image || ""
        });
          
          // Set time components for pickers if time values exist
          if (startTime) {
            const timeMatch = startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (timeMatch) {
              setTimeComponents({
                hour: timeMatch[1],
                minute: timeMatch[2],
                period: timeMatch[3].toUpperCase()
              });
            }
          }

          if (endTime) {
            const timeMatch = endTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (timeMatch) {
              setEndTimeComponents({
                hour: timeMatch[1],
                minute: timeMatch[2],
                period: timeMatch[3].toUpperCase()
              });
            }
          }
          
          // Price handling - determine if it's a ticket-based or price range item
          if (usePriceRange(item.type)) {
            // Handle price range for Food & Beverage and Accommodation
            try {
              // Check if there's a dedicated priceRange field
              if (item.priceRange) {
                const priceRangeData = typeof item.priceRange === 'string' 
                  ? JSON.parse(item.priceRange)
                  : item.priceRange;
                
                setPriceRange(priceRangeData);
              } else if (item.price) {
                // Try to parse from price string (e.g., "100-200 USD")
                const priceMatch = item.price.match(/(\d+)(?:-(\d+))?\s*([A-Z]{3})?/i);
                if (priceMatch) {
                  setPriceRange({
                    min: priceMatch[1] || "",
                    max: priceMatch[2] || priceMatch[1] || "",
                    currency: priceMatch[3] || "USD"
                  });
                } else {
                  // Default price range
                  setPriceRange({
                    min: "",
                    max: "",
                    currency: "USD"
                  });
                }
              }
            } catch (e) {
              console.error("Error parsing price range:", e);
              setPriceRange({
                min: "",
                max: "",
                currency: "USD"
              });
            }
          } else {
            // Parse ticket data if available (from JSON string or array)
            if (item.tickets) {
              try {
                // Parse ticket data properly, ensuring we handle both string and object formats
                let ticketsData;
                if (typeof item.tickets === 'string') {
                  // Try to parse as JSON first
                  try {
                    ticketsData = JSON.parse(item.tickets);
                  } catch (parseError) {
                    // If that fails, check if it's using our custom format with parentheses
                    if (item.tickets.includes('(') && item.tickets.includes('|')) {
                      const lines = item.tickets.split('\n');
                      ticketsData = lines.map(line => {
                        const match = line.match(/\(([^|]+)\|([^|]+)\|([^)]+)\)/);
                        if (match) {
                          return {
                            id: `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            name: match[1] || 'Ticket',
                            price: match[2] || '',
                            currency: match[3] || 'USD'
                          };
                        }
                        return null;
                      }).filter(ticket => ticket !== null);
                    }
                  }
                } else {
                  // If it's already an object, use it directly
                  ticketsData = item.tickets;
                }
                
                if (Array.isArray(ticketsData) && ticketsData.length > 0) {
                  // Ensure each ticket has required properties and convert to the current Ticket interface
                  const cleanedTickets = ticketsData.map(ticket => ({
                    id: ticket.id || `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: ticket.name || "General Admission",
                    price: ticket.price || "",
                    currency: ticket.currency || "USD"
                  }));
                  
                  console.log("Loading multiple tickets:", cleanedTickets);
                  setTickets(cleanedTickets);
                } else {
                  console.log("No valid tickets found in tickets field, checking price field");
                  
                  // If no valid tickets were found, check the price field as a fallback
                  if (item.price && typeof item.price === 'string') {
                    if (item.price.includes('(') && item.price.includes('|')) {
                      // This is likely our custom multi-ticket format in the price field
                      console.log("Found formatted tickets in price field:", item.price);
                      const lines = item.price.split('\n');
                      const priceTickets = lines.map(line => {
                        const match = line.match(/\(([^|]+)\|([^|]+)\|([^)]+)\)/);
                        if (match) {
                          return {
                            id: `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            name: match[1].trim() || 'Ticket',
                            price: match[2].trim() || '',
                            currency: match[3].trim() || 'USD'
                          };
                        }
                        return null;
                      }).filter(ticket => ticket !== null);
                      
                      if (priceTickets.length > 0) {
                        console.log("Parsed tickets from price field:", priceTickets);
                        setTickets(priceTickets);
                      } else {
                        // Create a standard ticket from price
                        setTickets([{
                          id: "ticket-1",
                          name: "General Admission",
                          price: item.price.replace(/[^\d.]/g, ''), // Remove currency symbols
                          currency: "USD"
                        }]);
                      }
                    } else {
                      // Regular price field, create a standard ticket
                      setTickets([{
                        id: "ticket-1",
                        name: "General Admission",
                        price: item.price.replace(/[^\d.]/g, ''), // Remove currency symbols
                        currency: "USD"
                      }]);
                    }
                  } else {
                    // No price information at all, create an empty ticket
                    setTickets([{
                      id: "ticket-1",
                      name: "General Admission",
                      price: "",
                      currency: "USD"
                    }]);
                  }
                }
              } catch (e) {
                console.error("Error parsing ticket data:", e);
                
                // Create a fallback ticket
                setTickets([{
                  id: "ticket-1",
                  name: "General Admission",
                  price: "",
                  currency: "USD"
                }]);
              }
            } else if (item.price) {
              // Legacy: Create a ticket from the price field
              setTickets([{
                id: "ticket-1",
                name: "General Admission",
                price: item.price.replace(/[^\d.]/g, ''), // Remove currency symbols
                currency: "USD"
              }]);
            }
          }
          
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
                endDate: item.endDate ? true : false,
                time: item.time ? true : false,
                endTime: item.endTime ? true : false,
                address: item.address ? true : false,
                description: item.description ? true : false,
                tickets: useTickets(item.type) || (item.price && !usePriceRange(item.type)) ? true : false,
                priceRange: usePriceRange(item.type) ? true : false,
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

  // Add a useEffect after our parseTicketsFromItem function to handle edit mode ticket parsing

  // useEffect for handling edit mode and parsing tickets
  useEffect(() => {
    // Check if we're in edit mode
    if (isEditMode) {
      console.log("Edit mode detected, processing tickets");
      
      try {
        // Get the stored item from localStorage
        const storedItem = localStorage.getItem('editItem');
        if (storedItem) {
          const parsedItem = JSON.parse(storedItem);
          console.log("Loaded item for editing:", parsedItem);
          
          // Use our helper function to parse tickets from the item
          const parsedTickets = parseTicketsFromItem(parsedItem);
          console.log("Parsed tickets for editing:", parsedTickets);
          
          // Update the tickets state with the parsed tickets
          setTickets(parsedTickets);
        }
      } catch (err) {
        console.error("Error processing edit item tickets:", err);
      }
    }
  }, [isEditMode]); // Only run when isEditMode changes

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
    
    // Clear the error for this field when it's being edited
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate a date string (mm/dd/yyyy format)
  const validateDate = (dateString: string): boolean => {
    if (!dateString) return true; // Allow empty string
    
    // Updated regex to accept dates with or without leading zeros
    const regex = /^([1-9]|0[1-9]|1[0-2])\/([1-9]|0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
    
    if (!regex.test(dateString)) {
      // Also check for date ranges (in case they come in as a whole)
      const dateRangeRegex = /^([1-9]|0[1-9]|1[0-2])\/([1-9]|0[1-9]|[12][0-9]|3[01])\/\d{4}\s*-\s*([1-9]|0[1-9]|1[0-2])\/([1-9]|0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
      if (dateRangeRegex.test(dateString)) {
        return true;
      }
      return false;
    }
    
    // Check if the date is valid (e.g., not 02/31/2023)
    const parts = dateString.split('/');
    const month = parseInt(parts[0], 10);
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    // Handle year validation - ensure it's a reasonable range (e.g., 1900-2100)
    if (year < 1900 || year > 2100) {
      return false;
    }
    
    const date = new Date(year, month - 1, day);
    return date.getMonth() === month - 1 && 
           date.getDate() === day && 
           date.getFullYear() === year;
  };
  
  // Validate a time string (hh:mm AM/PM format)
  const validateTime = (timeString: string): boolean => {
    if (!timeString) return true; // Allow empty string
    
    // More flexible regex to handle different AM/PM formats and time ranges
    const singleTimeRegex = /^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM|am|pm)$/i;
    
    if (singleTimeRegex.test(timeString)) {
      return true;
    }
    
    // Check for time range format (e.g., "9:00 AM - 5:00 PM")
    const timeRangeRegex = /^(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM|am|pm)\s*-\s*(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM|am|pm)$/i;
    return timeRangeRegex.test(timeString);
  };
  
  // Validate date range (start and end dates)
  const validateDateRange = (start: string, end: string): boolean => {
    if (!start || !end) return true; // Allow empty strings
    
    if (!validateDate(start) || !validateDate(end)) {
      return false;
    }
    
    const startParts = start.split('/');
    const endParts = end.split('/');
    
    const startDate = new Date(
      parseInt(startParts[2]), 
      parseInt(startParts[0]) - 1, 
      parseInt(startParts[1])
    );
    const endDate = new Date(
      parseInt(endParts[2]), 
      parseInt(endParts[0]) - 1, 
      parseInt(endParts[1])
    );
    
    return endDate >= startDate;
  };
  
  // Validate time range
  const validateTimeRange = (start: string, end: string): boolean => {
    if (!start || !end) return true; // Allow empty strings
    
    if (!validateTime(start) || !validateTime(end)) {
      return false;
    }
    
    // Convert to 24-hour format for comparison
    const convertTo24Hour = (timeStr: string) => {
      const [time, period] = timeStr.split(/\s+/);
      let [hours, minutes] = time.split(':').map(Number);
      
      if (period.toLowerCase() === 'pm' && hours < 12) {
        hours += 12;
      } else if (period.toLowerCase() === 'am' && hours === 12) {
        hours = 0;
      }
      
      return { hours, minutes };
    };
    
    // Extract time from potential range format
    const extractSingleTime = (timeStr: string): string => {
      const timeRangeMatch = timeStr.match(/^(.*?)\s*-\s*.*$/);
      return timeRangeMatch ? timeRangeMatch[1].trim() : timeStr.trim();
    };
    
    const startTimeStr = extractSingleTime(start);
    const endTimeStr = extractSingleTime(end);
    
    try {
      const startTime = convertTo24Hour(startTimeStr);
      const endTime = convertTo24Hour(endTimeStr);
      
      // If dates are the same, check time
      if (formData.date === formData.endDate) {
        if (startTime.hours > endTime.hours) {
          return false;
        }
        
        if (startTime.hours === endTime.hours && 
            startTime.minutes >= endTime.minutes) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error("Error validating time range:", error);
      return false;
    }
  };
  
  // Validate a ticket
  const validateTicket = (ticket: Ticket): { isValid: boolean, errors: string[] } => {
    const errors: string[] = [];
    
    if (!ticket.name.trim()) {
      errors.push("Ticket name is required");
    }
    
    if (ticket.price && isNaN(parseFloat(ticket.price))) {
      errors.push("Price must be a valid number");
    }
    
    return { 
      isValid: errors.length === 0,
      errors
    };
  };
  
  // Validate price range
  const validatePriceRange = (range: PriceRange): { isValid: boolean, errors: string[] } => {
    const errors: string[] = [];
    
    // Check for required fields for Food & Beverage and Accommodation categories
    if ((formData.type === "Food & Beverage" || formData.type === "Accommodation")) {
      if (!range.min) {
        errors.push("Minimum price is required");
      }
      
      if (!range.max) {
        errors.push("Maximum price is required");
      }
      
      if (!range.currency) {
        errors.push("Currency is required");
      }
    }
    
    // Check for valid numbers
    if (range.min && isNaN(parseFloat(range.min))) {
      errors.push("Minimum price must be a valid number");
    }
    
    if (range.max && isNaN(parseFloat(range.max))) {
      errors.push("Maximum price must be a valid number");
    }
    
    // Check that max >= min if both are specified
    if (range.min && range.max && 
        !isNaN(parseFloat(range.min)) && !isNaN(parseFloat(range.max)) &&
        parseFloat(range.max) < parseFloat(range.min)) {
      errors.push("Maximum price must be greater than or equal to minimum price");
    }
    
    // Check if prices are positive
    if (range.min && !isNaN(parseFloat(range.min)) && parseFloat(range.min) < 0) {
      errors.push("Minimum price cannot be negative");
    }
    
    if (range.max && !isNaN(parseFloat(range.max)) && parseFloat(range.max) < 0) {
      errors.push("Maximum price cannot be negative");
    }
    
    return { 
      isValid: errors.length === 0,
      errors
    };
  };
  
  // Validate all form fields
  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    
    if (!formData.type) {
      newErrors.type = "Category is required";
    }
    
    // Validate dates if visible
    if (visibleComponents.date && formData.date && !validateDate(formData.date)) {
      newErrors.date = "Invalid date format. Use mm/dd/yyyy";
    }
    
    if (visibleComponents.endDate && formData.endDate && !validateDate(formData.endDate)) {
      newErrors.endDate = "Invalid date format. Use mm/dd/yyyy";
    }
    
    // Validate date range
    if (visibleComponents.date && visibleComponents.endDate && 
        formData.date && formData.endDate && 
        !validateDateRange(formData.date, formData.endDate)) {
      newErrors.endDate = "End date must be after or equal to start date";
    }
    
    // Validate times
    if (visibleComponents.time && formData.time && !validateTime(formData.time)) {
      newErrors.time = "Invalid time format. Use hh:mm AM/PM";
    }
    
    if (visibleComponents.endTime && formData.endTime && !validateTime(formData.endTime)) {
      newErrors.endTime = "Invalid time format. Use hh:mm AM/PM";
    }
    
    // Validate time range
    if (visibleComponents.time && visibleComponents.endTime && 
        formData.time && formData.endTime && 
        !validateTimeRange(formData.time, formData.endTime)) {
      newErrors.endTime = "End time must be after start time";
    }
    
    // Validate address for required categories
    if (visibleComponents.address) {
      const isAddressRequired = [
        "Accommodation", 
        "Food & Beverage", 
        "SOS assistants",
        "Sightseeing Spots",
        "Entertainment"
      ].includes(formData.type);
      
      // If address is required for this category or the address component is visible
      if ((isAddressRequired && !formData.address.trim()) || 
          (!isAddressRequired && visibleComponents.address && !formData.address.trim())) {
        newErrors.address = "Address is required for this category";
      }
    }
    
    // Ensure Events and Entertainment have end date/time
    if ((formData.type === "Event" || formData.type === "Entertainment") && 
        visibleComponents.date && visibleComponents.time) {
      if (!formData.date) newErrors.date = "Start date is required for events";
      if (!formData.time) newErrors.time = "Start time is required for events";
      if (!formData.endDate) newErrors.endDate = "End date is required for events";
      if (!formData.endTime) newErrors.endTime = "End time is required for events";
    }
    
    // Description validation for FAQ and SOS assistants
    if (formData.type === "FAQ" && visibleComponents.description && !formData.description.trim()) {
      newErrors.description = "Answer is required for FAQ items";
    }
    
    if (formData.type === "SOS assistants" && visibleComponents.description) {
      if (!formData.description.trim()) {
        newErrors.description = "Description with phone number is required";
      } else if (!formData.description.includes("Phone number:")) {
        newErrors.description = "Phone number is required in the format: 'Phone number: +X-XXX-XXX-XXXX'";
      } else {
        // Validate phone number format
        const phoneNumberMatch = formData.description.match(/Phone number:\s*(\+?[0-9\-\s]+)/i);
        if (!phoneNumberMatch || phoneNumberMatch[1].trim().length < 7) {
          newErrors.description = "Valid phone number is required";
        }
      }
    }
    
    // Validate price range if visible
    if (visibleComponents.priceRange) {
      const { isValid, errors: priceRangeErrors } = validatePriceRange(priceRange);
      if (!isValid && priceRangeErrors.length > 0) {
        newErrors.priceRange = priceRangeErrors[0];
      }
    }
    
    // Validate tickets if required and visible
    if (visibleComponents.tickets && 
        (formData.type === "Event" || formData.type === "Entertainment") && 
        tickets.length > 0) {
      
      // Validate each ticket
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        const { isValid, errors: ticketErrors } = validateTicket(ticket);
        
        if (!isValid) {
          newErrors.tickets = `Ticket #${i + 1}: ${ticketErrors.join(", ")}`;
          break;
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatTimeRange = () => {
    if (!formData.time) return "";
    if (!formData.endTime) return formData.time;
    return `${formData.time} - ${formData.endTime}`;
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
      
      // Special handling for SOS assistants category
      if (selectedCategory.name === "SOS assistants" && updated.description && 
          !updated.description.includes("Phone number:") && updated.description.trim() !== "") {
        updated.description = "Phone number: " + updated.description;
      }
      
      console.log("Updated form data:", updated);
      return updated;
    });
    
    // Apply the template for the selected category
    if (categoryTemplates[selectedCategory.name]) {
      setVisibleComponents(categoryTemplates[selectedCategory.name]);
      
      // Customize visible components for special categories
      if (selectedCategory.name === "FAQ") {
        // FAQ needs only name (question) and description (answer)
        setVisibleComponents({
          name: true,           // Question
          description: true,    // Answer
          date: false,
          endDate: false,
          time: false,
          endTime: false,
          address: false,
          tickets: false,
          priceRange: false,
          image: true           // Keep image support for FAQ entries
        });
      } else if (selectedCategory.name === "SOS assistants") {
        // SOS assistants needs name (support type), description (with phone), and address
        setVisibleComponents({
          name: true,           // Support Type
          description: true,    // Description with phone
          address: true,        // Address is important for SOS contacts
          date: false,
          endDate: false,
          time: false,
          endTime: false,
          tickets: false,
          priceRange: false,
          image: true           // Keep image support
        });
      }
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
        endDate: true,
        time: true,
        endTime: true,
        address: true,
        description: true,
        tickets: true,
        priceRange: false,
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
        endDate: true,
        time: true,
        endTime: true,
        address: true,
        description: true,
        tickets: true,
        priceRange: false,
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
    // Clean and normalize the address
    const cleanedAddress = value?.trim() || "";
    
    // Update form data with the clean address
    setFormData(prev => ({ ...prev, address: cleanedAddress }));
    
    // Clear any existing address error if we now have a valid address
    if (cleanedAddress && errors.address) {
      setErrors(prev => ({ ...prev, address: "" }));
    }
    
    // If we have coordinates, store them in the location field
    if (latLng) {
      setFormData(prev => ({ ...prev, location: JSON.stringify(latLng) }));
    }
    
      // Set addressHasMap to true if we have map coordinates, 
    // which will trigger the map display
      if (!addressHasMap) {
        setAddressHasMap(true);
      }
    
    // Log the address being set (for development/debugging)
    if (process.env.NODE_ENV === 'development') {
      console.log(`Setting address to: "${cleanedAddress}"`);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("Starting form submission with tickets:", tickets);
    
    try {
      setSubmitError(null);
      
      // Validate all form fields
      if (!validateForm()) {
        // Get first error to display
        const firstError = Object.values(errors)[0];
        setSubmitError(firstError || "Please correct the errors before submitting");
        return;
      }
      
      setIsSubmitting(true);
      
      // Create formatted date range and time strings
      let formattedDateRange = "";
      let formattedTime = "";
      
      if (visibleComponents.date && formData.date) {
        if (visibleComponents.endDate && formData.endDate && formData.date !== formData.endDate) {
          // Format as a range if both dates are provided and different
          formattedDateRange = `${formData.date} - ${formData.endDate}`;
        } else {
          // Just use the start date if no end date or dates are the same
          formattedDateRange = formData.date;
        }
      }
      
      if (visibleComponents.time && formData.time) {
        if (visibleComponents.endTime && formData.endTime && formData.time !== formData.endTime) {
          // Format as a range if both times are provided and different
          formattedTime = `${formData.time} - ${formData.endTime}`;
        } else {
          // Just use the start time if no end time or times are the same
          formattedTime = formData.time;
        }
      }
      
      // Update both combined and individual fields
      const standardizedData = {
        ...formData,
        date: formattedDateRange,
        time: formattedTime,
        startDate: formData.date,
        endDate: formData.endDate,
        startTime: formData.time,
        endTime: formData.endTime
      };
      console.log("Standardized data:", standardizedData);
      
      // Handle location data separately
      const locationDataJson = locationData.lat && locationData.lng 
        ? JSON.stringify({ lat: locationData.lat, lng: locationData.lng }) 
        : undefined;
      
      // Handle price data based on category type
      let priceData = "";
      let ticketsJson = "[]";
      
      if (usePriceRange(formData.type)) {
        // For Food & Beverage and Accommodation, use price range
        if (priceRange.min || priceRange.max) {
          if (priceRange.min && priceRange.max && priceRange.min === priceRange.max) {
            // Single price
            priceData = `${priceRange.min} ${priceRange.currency}`;
          } else if (priceRange.min && priceRange.max) {
            // Range
            priceData = `${priceRange.min}-${priceRange.max} ${priceRange.currency}`;
          } else if (priceRange.min) {
            // Only min
            priceData = `From ${priceRange.min} ${priceRange.currency}`;
          } else if (priceRange.max) {
            // Only max
            priceData = `Up to ${priceRange.max} ${priceRange.currency}`;
          }
        } else {
          priceData = "Free";
        }
        
        // Store price range as JSON for future editing
        const priceRangeJson = JSON.stringify(priceRange);
        
        // Prepare data with required fields based on visible components
        const dataToSubmit = {
          ...standardizedData,
          // All fields must be at least empty strings to satisfy the AdminInputKnowledgeItem type
          name: standardizedData.name || "",
          category: standardizedData.type || "", // Map type to category for API compatibility
          type: standardizedData.type || "",     // Keep type for backward compatibility
          address: standardizedData.address || "",
          description: standardizedData.description || "",
          // For price range categories
          price: priceData,
          priceRange: priceRangeJson,
          tickets: ticketsJson,
          // Format combined time for backward compatibility
          time: formattedTime || "",
          // Store individual times
          startTime: standardizedData.time || "",
          endTime: standardizedData.endTime || "",
          // Format combined date for backward compatibility
          date: formattedDateRange || "",
          // Store individual dates
          startDate: standardizedData.date || "",
          endDate: standardizedData.endDate || "",
          // Include location data if available
          location: locationDataJson,
          // Ensure image is either a valid string or null
          image: standardizedData.image && typeof standardizedData.image === 'string' ? standardizedData.image : null
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
      } else {
        // For Event, Entertainment, and others, use tickets
        if (tickets.length > 0) {
          // Ensure all tickets have required fields with defaults
          const validTickets = tickets.map(ticket => ({
            id: ticket.id || `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: ticket.name || "General Admission",
            price: ticket.price || "0",
            currency: ticket.currency || "USD"
          }));
          
          console.log("Processing tickets for submission:", validTickets);
          
          // Format ticket data for display with a format that won't get HTML-encoded
          // Use parentheses and a pipe character to avoid any HTML encoding issues
          const formattedTickets = validTickets.map(ticket => 
            `(${ticket.name}|${ticket.price}|${ticket.currency})`
          ).join("\n");
          
          console.log("Formatted tickets for display:", formattedTickets);
          
          // Use the formatted tickets string as the price data for display
          if (validTickets.length > 1) {
            // For multiple tickets, use the formatted string for display
            priceData = formattedTickets;
            console.log("Multiple tickets - setting priceData to formatted string:", priceData);
          } else if (validTickets.length === 1) {
            // For a single ticket, use a simpler format
            priceData = validTickets[0].price ? `${validTickets[0].price} ${validTickets[0].currency}` : "Free";
            console.log("Single ticket - setting priceData to:", priceData);
          } else {
            priceData = "Free";
            console.log("No valid tickets - setting priceData to:", priceData);
          }
          
          // Serialize tickets to JSON string - Always include all ticket data
          // This is critical for preserving multiple tickets when editing
          ticketsJson = JSON.stringify(validTickets);
          console.log("Final ticketsJson for saving:", ticketsJson);
          console.log("Ticket count:", validTickets.length);
        } else {
          priceData = "Free";
          ticketsJson = "[]";
          console.log("No tickets - setting empty tickets JSON");
        }
        
        // Prepare data with required fields based on visible components
        const dataToSubmit = {
          ...standardizedData,
          // All fields must be at least empty strings to satisfy the AdminInputKnowledgeItem type
          name: standardizedData.name || "",
          category: standardizedData.type || "", // Map type to category for API compatibility
          type: standardizedData.type || "",     // Keep type for backward compatibility
          address: standardizedData.address || "",
          description: standardizedData.description || "",
          // For ticket categories
          price: priceData,
          tickets: ticketsJson,
          // Format combined time for backward compatibility
          time: formattedTime || "",
          // Store individual times
          startTime: standardizedData.time || "",
          endTime: standardizedData.endTime || "",
          // Format combined date for backward compatibility
          date: formattedDateRange || "",
          // Store individual dates
          startDate: standardizedData.date || "",
          endDate: standardizedData.endDate || "",
        // Include location data if available
        location: locationDataJson,
        // Ensure image is either a valid string or null
        image: standardizedData.image && typeof standardizedData.image === 'string' ? standardizedData.image : null
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

  // Add the missing updateEndTimeFromComponents function
  const updateEndTimeFromComponents = (components: { hour: string; minute: string; period: string }) => {
    if (components.hour && components.minute && components.period) {
      const formattedTime = `${components.hour}:${components.minute} ${components.period}`;
      handleInputChange('endTime', formattedTime);
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

  // Find the existing effect for time components and add similar for end time components
  useEffect(() => {
    // Parse time string to components when time changes
    if (formData.time) {
      try {
        // Extract hour, minute, and period from time string (e.g., "09:30 AM")
        const timeMatch = formData.time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
        if (timeMatch) {
          const hour = parseInt(timeMatch[1], 10);
          const minute = timeMatch[2];
          const period = timeMatch[3].toUpperCase();
          
          setTimeComponents({
            hour: hour.toString(),
            minute,
            period
          });
        }
      } catch (error) {
        console.error("Error parsing time:", error);
      }
    }
  }, [formData.time]);

  // Parse end time string to components when end time changes
  useEffect(() => {
    if (formData.endTime) {
      try {
        // Extract hour, minute, and period from time string (e.g., "09:30 AM")
        const timeMatch = formData.endTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
        if (timeMatch) {
          const hour = parseInt(timeMatch[1], 10);
          const minute = timeMatch[2];
          const period = timeMatch[3].toUpperCase();
          
          setEndTimeComponents({
            hour: hour.toString(),
            minute,
            period
          });
        }
      } catch (error) {
        console.error("Error parsing end time:", error);
      }
    }
  }, [formData.endTime]);

  // Add a useEffect to log ticket state changes
  useEffect(() => {
    console.log("Tickets state updated:", tickets);
  }, [tickets]);

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
                  <div className={`flex items-center justify-between p-3 bg-white/5 border rounded-md ${errors.type ? 'border-red-500' : 'border-white/10'}`}>
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
                    className={`w-full justify-between bg-white/5 border text-white hover:bg-white/10 ${errors.type ? 'border-red-500' : 'border-white/10'}`}
                  >
                    <span>Select Category Type</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                )}
                {errors.type && (
                  <p className="text-xs text-red-400">{errors.type}</p>
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
                    {formData.type === "FAQ" ? "Question" : 
                     formData.type === "SOS assistants" ? "Support Type" : 
                     "Name"} <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder={formData.type === "FAQ" ? "Enter question" : 
                                formData.type === "SOS assistants" ? "Enter support type" :
                                "Enter name"}
                    className={`bg-white/5 border-white/10 text-white placeholder:text-white/30 ${errors.name ? 'border-red-500' : ''}`}
                    required
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-400">{errors.name}</p>
                  )}
                </div>
              )}
            
              {/* Date and Time Section - Rearranged */}
              <div className="space-y-4">
                
                {/* Start Date/Time Row */}
              <div className="grid grid-cols-2 gap-4">
                  {/* Start Date */}
                {visibleComponents.date && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-white/70">
                        Start Date
                        {formData.type === "Event" && <span className="text-red-400">*</span>}
                      </label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="mm/dd/yyyy"
                        value={formData.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                        onClick={() => setShowDatePicker(prev => !prev)}
                          className={`bg-white/5 border-white/10 text-white placeholder:text-white/30 cursor-pointer pl-10 ${errors.date ? 'border-red-500' : ''}`}
                      />
                      {/* Calendar icon */}
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400">
                        <CalendarIcon className="h-4 w-4" />
                      </div>
                        
                        {/* Error message */}
                        {errors.date && (
                          <p className="mt-1 text-xs text-red-400">{errors.date}</p>
                        )}
                      
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
            
                  {/* Start Time */}
                {visibleComponents.time && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-white/70">
                        Start Time
                        {(formData.type === "Event" || formData.type === "Food & Beverage") && <span className="text-red-400">*</span>}
                      </label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={formData.time}
                        onChange={(e) => handleInputChange('time', e.target.value)}
                          placeholder="hh:mm AM/PM"
                        onClick={() => setShowTimePicker(prev => !prev)}
                          className={`bg-white/5 border-white/10 text-white placeholder:text-white/30 pl-10 cursor-pointer ${errors.time ? 'border-red-500' : ''}`}
                      />
                      {/* Clock icon */}
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400">
                        <Clock className="h-4 w-4" />
                      </div>
                      
                        {/* Error message */}
                        {errors.time && (
                          <p className="mt-1 text-xs text-red-400">{errors.time}</p>
                        )}
                        
                        {/* Time picker dropdown code remains unchanged */}
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
            
                {/* End Date/Time Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* End Date */}
                  {visibleComponents.endDate && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-white/70">
                        End Date
                        {formData.type === "Event" && <span className="text-red-400">*</span>}
                      </label>
                      <div className="relative">
                  <Input
                          type="text"
                          placeholder="mm/dd/yyyy"
                          value={formData.endDate}
                          onChange={(e) => handleInputChange('endDate', e.target.value)}
                          onClick={() => setShowEndDatePicker(prev => !prev)}
                          className={`bg-white/5 border-white/10 text-white placeholder:text-white/30 pl-10 cursor-pointer ${errors.endDate ? 'border-red-500' : ''}`}
                        />
                        {/* Calendar icon */}
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400">
                          <CalendarIcon className="h-4 w-4" />
                </div>
                        
                        {/* Error message */}
                        {errors.endDate && (
                          <p className="mt-1 text-xs text-red-400">{errors.endDate}</p>
                        )}
                        
                        {/* End Date picker dropdown */}
                        {showEndDatePicker && (
                          <div className="absolute z-50 mt-2 w-full max-w-[350px]">
                            <div className="calendar-wrapper bg-[#1A1625] border border-white/15 rounded-lg shadow-xl overflow-hidden">
                              <div className="flex justify-between items-center p-3 bg-indigo-950/30 border-b border-white/10">
                                <button 
                                  onClick={() => {
                                    const currentDate = formData.endDate ? new Date(formData.endDate) : new Date();
                                    const newDate = new Date(currentDate);
                                    newDate.setMonth(currentDate.getMonth() - 1);
                                    handleInputChange('endDate', `${newDate.getMonth() + 1}/${newDate.getDate()}/${newDate.getFullYear()}`);
                                  }}
                                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/70 transition-colors"
                                  aria-label="Previous month"
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </button>
                                <div className="text-sm font-medium text-white">
                                  {formData.endDate 
                                    ? new Date(formData.endDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                                    : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </div>
                                <button 
                                  onClick={() => {
                                    const currentDate = formData.endDate ? new Date(formData.endDate) : new Date();
                                    const newDate = new Date(currentDate);
                                    newDate.setMonth(currentDate.getMonth() + 1);
                                    handleInputChange('endDate', `${newDate.getMonth() + 1}/${newDate.getDate()}/${newDate.getFullYear()}`);
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
                                    const isSelected = formData.endDate && 
                                      new Date(formData.endDate).toDateString() === dateObj.date.toDateString();
                                    const isToday = new Date().toDateString() === dateObj.date.toDateString();
                                    const isWeekend = dateObj.date.getDay() === 0 || dateObj.date.getDay() === 6;
                                    
                                    return (
                                      <button
                                        key={index}
                                        onClick={() => {
                                          const date = dateObj.date;
                                          const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
                                          handleInputChange('endDate', formattedDate);
                                          setShowEndDatePicker(false);
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
                                    handleInputChange('endDate', formattedDate);
                                    setShowEndDatePicker(false);
                                  }}
                                  className="text-xs py-1 px-2 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 rounded-md transition-colors"
                                >
                                  Today
                                </button>
                                <button 
                                  onClick={() => setShowEndDatePicker(false)}
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
            
                  {/* End Time */}
                  {visibleComponents.endTime && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-white/70">
                        End Time
                        {(formData.type === "Event" || formData.type === "Food & Beverage") && <span className="text-red-400">*</span>}
                      </label>
                      <div className="relative">
                        <Input
                          type="text"
                          value={formData.endTime}
                          onChange={(e) => handleInputChange('endTime', e.target.value)}
                          placeholder="hh:mm AM/PM"
                          onClick={() => setShowEndTimePicker(prev => !prev)}
                          className={`bg-white/5 border-white/10 text-white placeholder:text-white/30 pl-10 cursor-pointer ${errors.endTime ? 'border-red-500' : ''}`}
                        />
                        {/* Clock icon */}
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400">
                          <Clock className="h-4 w-4" />
                        </div>
                        
                        {/* Error message */}
                        {errors.endTime && (
                          <p className="mt-1 text-xs text-red-400">{errors.endTime}</p>
                        )}
                        
                        {/* End Time picker dropdown */}
                        {showEndTimePicker && (
                          <div className="absolute z-50 mt-2 w-full max-w-[350px]">
                            <div className="time-picker-wrapper bg-[#1A1625] border border-white/15 rounded-lg shadow-xl overflow-hidden">
                              <div className="p-3 bg-indigo-950/30 border-b border-white/10">
                                <div className="text-sm font-medium text-white text-center">Set End Time</div>
                              </div>
                              
                              <div className="p-4">
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="space-y-1">
                                    <label className="block text-xs font-medium text-white/50 text-center mb-2">Hour</label>
                                    <div className="relative flex flex-col items-center">
                                      <button 
                                        className="bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center mb-2"
                                        onClick={() => {
                                          const hour = parseInt(endTimeComponents.hour || '12');
                                          const newHour = hour >= 12 ? 1 : hour + 1;
                                          setEndTimeComponents({...endTimeComponents, hour: newHour.toString().padStart(2, '0')});
                                          updateEndTimeFromComponents({...endTimeComponents, hour: newHour.toString().padStart(2, '0')});
                                        }}
                                        aria-label="Increase hour"
                                        title="Increase hour"
                                      >
                                        <ChevronUp className="h-4 w-4 text-white/70" />
                                      </button>
                                          
                                          <div className="w-full text-center bg-white/5 py-2 px-3 rounded-md text-white font-mono text-lg">
                                            {endTimeComponents.hour || '12'}
                                          </div>
                                          
                                          <button 
                                            className="bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center mt-2"
                                            onClick={() => {
                                              const hour = parseInt(endTimeComponents.hour || '12');
                                              const newHour = hour <= 1 ? 12 : hour - 1;
                                              setEndTimeComponents({...endTimeComponents, hour: newHour.toString().padStart(2, '0')});
                                              updateEndTimeFromComponents({...endTimeComponents, hour: newHour.toString().padStart(2, '0')});
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
                                          const minute = parseInt(endTimeComponents.minute || '0');
                                          const newMinute = minute >= 55 ? 0 : minute + 5;
                                          setEndTimeComponents({...endTimeComponents, minute: newMinute.toString().padStart(2, '0')});
                                          updateEndTimeFromComponents({...endTimeComponents, minute: newMinute.toString().padStart(2, '0')});
                                        }}
                                        aria-label="Increase minute"
                                        title="Increase minute"
                                      >
                                        <ChevronUp className="h-4 w-4 text-white/70" />
                                      </button>
                                          
                                          <div className="w-full text-center bg-white/5 py-2 px-3 rounded-md text-white font-mono text-lg">
                                            {endTimeComponents.minute || '00'}
                                          </div>
                                          
                                          <button 
                                            className="bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center mt-2"
                                            onClick={() => {
                                              const minute = parseInt(endTimeComponents.minute || '0');
                                              const newMinute = minute <= 0 ? 55 : minute - 5;
                                              setEndTimeComponents({...endTimeComponents, minute: newMinute.toString().padStart(2, '0')});
                                              updateEndTimeFromComponents({...endTimeComponents, minute: newMinute.toString().padStart(2, '0')});
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
                                          endTimeComponents.period === 'AM' 
                                            ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30' 
                                            : 'bg-white/5 text-white/70 hover:bg-white/10'
                                        }`}
                                        onClick={() => {
                                          setEndTimeComponents({...endTimeComponents, period: 'AM'});
                                          updateEndTimeFromComponents({...endTimeComponents, period: 'AM'});
                                        }}
                                      >
                                        AM
                                      </button>
                                          
                                          <button 
                                            className={`py-2 rounded-md text-center font-medium text-sm ${
                                              endTimeComponents.period === 'PM' 
                                                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30' 
                                                : 'bg-white/5 text-white/70 hover:bg-white/10'
                                            }`}
                                            onClick={() => {
                                              setEndTimeComponents({...endTimeComponents, period: 'PM'});
                                              updateEndTimeFromComponents({...endTimeComponents, period: 'PM'});
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
                                    {['11:00 AM', '2:00 PM', '5:00 PM', '8:00 PM'].map(time => (
                                      <button 
                                        key={time}
                                        className={`py-1 px-2 text-xs rounded ${
                                          formData.endTime === time 
                                            ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30' 
                                            : 'bg-white/5 text-white/70 hover:bg-white/10'
                                        }`}
                                        onClick={() => {
                                          handleInputChange('endTime', time);
                                          setShowEndTimePicker(false);
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
                                    handleInputChange('endTime', '');
                                    setEndTimeComponents({ hour: '', minute: '', period: '' });
                                    setShowEndTimePicker(false);
                                  }}
                                  className="text-xs py-1 px-2 bg-white/5 text-white/70 hover:bg-white/10 rounded-md transition-colors"
                                >
                                  Clear
                                </button>
                                <button 
                                  onClick={() => setShowEndTimePicker(false)}
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
                
                {/* Additional context for event-type items */}
                {(formData.type && (formData.type === "Event" || formData.type === "Entertainment")) && (
                  <div className="bg-indigo-500/10 p-3 rounded-md border border-indigo-500/20 mt-2">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center mr-2">
                        <Info className="h-3.5 w-3.5 text-indigo-300" />
                      </div>
                      <p className="text-xs text-indigo-300">Events require both a start and end date/time</p>
                    </div>
                  </div>
                )}
              </div>
            
              {/* Price Range Section (for Food & Beverage and Accommodation) */}
              {visibleComponents.priceRange && usePriceRange(formData.type) && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-white/70">
                    Price Range
                    {(formData.type === "Food & Beverage" || formData.type === "Accommodation") && (
                      <span className="text-red-400">*</span>
                    )}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="text-sm text-white/70 mb-1 block">Minimum Price</label>
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="Min"
                          value={priceRange.min}
                          onChange={(e) => {
                            // Only allow numbers and decimal point
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            // Prevent multiple decimal points
                            const parts = value.split('.');
                            const sanitizedValue = parts.length > 2 
                              ? parts[0] + '.' + parts.slice(1).join('')
                              : value;
                            setPriceRange({...priceRange, min: sanitizedValue});
                          }}
                          className={`pl-8 bg-white/10 border-white/20 text-white ${
                            errors.priceRange && (priceRange.min === '' || 
                            (priceRange.min && isNaN(parseFloat(priceRange.min)))) 
                              ? 'border-red-500' 
                              : ''
                          }`}
                        />
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50">
                          {priceRange.currency === "USD" ? "$" : 
                           priceRange.currency === "EUR" ? "€" : 
                           priceRange.currency === "GBP" ? "£" : 
                           priceRange.currency === "USDT" ? "₮" : 
                           priceRange.currency === "USDC" ? "Ⓤ" : ""}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Enter a valid numeric amount</div>
                    </div>
                    <div>
                      <label className="text-sm text-white/70 mb-1 block">Maximum Price</label>
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder="Max"
                          value={priceRange.max}
                          onChange={(e) => {
                            // Only allow numbers and decimal point
                            const value = e.target.value.replace(/[^0-9.]/g, '');
                            // Prevent multiple decimal points
                            const parts = value.split('.');
                            const sanitizedValue = parts.length > 2 
                              ? parts[0] + '.' + parts.slice(1).join('')
                              : value;
                            setPriceRange({...priceRange, max: sanitizedValue});
                          }}
                          className={`pl-8 bg-white/10 border-white/20 text-white ${
                            errors.priceRange && (priceRange.max === '' || 
                            (priceRange.max && isNaN(parseFloat(priceRange.max)))) 
                              ? 'border-red-500' 
                              : ''
                          }`}
                        />
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50">
                          {priceRange.currency === "USD" ? "$" : 
                           priceRange.currency === "EUR" ? "€" : 
                           priceRange.currency === "GBP" ? "£" : 
                           priceRange.currency === "USDT" ? "₮" : 
                           priceRange.currency === "USDC" ? "Ⓤ" : ""}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-white/70 mb-1 block">Currency</label>
                      <Select
                        value={priceRange.currency}
                        onValueChange={(value) => setPriceRange({...priceRange, currency: value})}
                      >
                        <SelectTrigger className="h-10 bg-white/10 border-white/20 text-white">
                          <SelectValue placeholder="Select Currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-2 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded text-indigo-300 text-sm">
                    <Info className="inline-block h-4 w-4 mr-2" />
                    {usePriceRange(formData.type) && formData.type === "Food & Beverage" 
                      ? "Set the typical price range for menu items or leave empty if prices vary widely."
                      : "Set the price range for accommodation options or leave empty if prices vary by season."}
                  </div>
                </div>
              )}
            
              {/* Ticket Management - Replace the price field */}
              {visibleComponents.tickets && (
                <div className="border rounded-lg p-4 mb-6 bg-white/5 border-white/10 relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Tags className="h-5 w-5 mr-2 text-indigo-400" />
                      <h3 className="text-lg font-medium text-white">
                        Tickets
                        {tickets.length === 0 && <span className="text-xs text-indigo-300 ml-2">(free if no tickets)</span>}
                      </h3>
                    </div>
                    
                    <Button
                      variant="outline" 
                      size="sm"
                      onClick={() => setTickets([...tickets, {
                        id: `ticket-${Date.now()}`,
                        name: "",
                        price: "",
                        currency: "USD"
                      }])}
                      className="h-8 px-2 bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Ticket
                    </Button>
                  </div>
                  
                  {errors.tickets && (
                    <div className="p-2 mb-4 bg-red-500/20 border border-red-500/30 rounded text-red-300 text-sm">
                      {errors.tickets}
                    </div>
                  )}
                  
                  {tickets.length === 0 ? (
                    <div className="bg-white/5 border border-white/10 rounded-md p-4 text-center">
                      <p className="text-white/50 text-sm">No tickets added yet. This item will be free admission.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTickets([{
                          id: `ticket-${Date.now()}`,
                          name: "General Admission",
                          price: "",
                          currency: "USD"
                        }])}
                        className="mt-2 h-8 px-3 bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/30"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Ticket
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tickets.map((ticket, index) => (
                        <div 
                          key={ticket.id} 
                          className="bg-white/5 border border-white/10 rounded-md p-3 space-y-3"
                        >
                          <div className="flex justify-between">
                            <h4 className="text-sm font-medium text-white">Ticket #{index + 1}</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newTickets = [...tickets];
                                newTickets.splice(index, 1);
                                setTickets(newTickets);
                              }}
                              className="h-6 w-6 p-0 text-white/40 hover:text-white/70 hover:bg-white/10"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          
                          {/* Ticket name */}
                          <div>
                            <label className="text-xs text-white/70 mb-1 block">Ticket Name</label>
                            <Input
                              placeholder="e.g., VIP Access, General Admission"
                              value={ticket.name}
                              onChange={(e) => {
                                const newTickets = [...tickets];
                                newTickets[index].name = e.target.value;
                                setTickets(newTickets);
                              }}
                              className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                            />
                          </div>
                          
                          {/* Price and currency */}
                          <div className="grid grid-cols-5 gap-2">
                            <div className="col-span-3">
                              <label className="text-xs text-white/70 mb-1 block">Price (0 for free)</label>
                              <div className="relative">
                                <Input
                                  placeholder="Price"
                                  value={ticket.price}
                                  onChange={(e) => {
                                    // Only allow numbers and decimal point
                                    const value = e.target.value.replace(/[^0-9.]/g, '');
                                    const newTickets = [...tickets];
                                    newTickets[index].price = value;
                                    setTickets(newTickets);
                                  }}
                                  className="pl-8 bg-white/10 border-white/20 text-white placeholder:text-white/30"
                                />
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50">
                                  {ticket.currency === "USD" ? "$" : 
                                  ticket.currency === "EUR" ? "€" : 
                                  ticket.currency === "GBP" ? "£" : 
                                  ticket.currency === "USDT" ? "₮" : 
                                  ticket.currency === "USDC" ? "Ⓤ" : ""}
                                </span>
                              </div>
                            </div>
                            <div className="col-span-2">
                              <label className="text-xs text-white/70 mb-1 block">Currency</label>
                              <Select
                                value={ticket.currency}
                                onValueChange={(value) => {
                                  const newTickets = [...tickets];
                                  newTickets[index].currency = value;
                                  setTickets(newTickets);
                                }}
                              >
                                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                  <SelectValue placeholder="Currency" />
                                </SelectTrigger>
                                <SelectContent>
                                  {currencies.map(currency => (
                                    <SelectItem key={currency} value={currency}>
                                      {currency}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded text-indigo-300 text-sm">
                    <Info className="inline-block h-4 w-4 mr-2" />
                    {formData.type === "Event" 
                      ? "Create multiple ticket tiers for different pricing options (e.g., VIP, Standard, Early Bird)."
                      : "Set pricing options for different entertainment packages or experiences."}
                  </div>
                </div>
              )}
            
              {/* Description */}
              {visibleComponents.description && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-white/70">
                    {formData.type === "FAQ" ? "Answer" : "Description"}
                    {formData.type === "SOS assistants" && (
                      <span className="text-indigo-300 ml-1 text-xs">(include phone number)</span>
                    )}
                    {(formData.type === "FAQ" || formData.type === "SOS assistants" || formData.type === "Event") && (
                      <span className="text-red-400">*</span>
                    )}
                  </label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => {
                      let value = e.target.value;
                      
                      // For SOS assistants, ensure phone number format if not already present
                      if (formData.type === "SOS assistants" && !value.includes("Phone number:") && value.trim() !== "") {
                        // Only prepend if the user is typing something and hasn't already included phone number format
                        if (!value.toLowerCase().includes("phone") && !value.match(/^\s*phone number:/i)) {
                          value = "Phone number: " + value;
                        }
                      }
                      
                      handleInputChange('description', value);
                    }}
                    placeholder={formData.type === "FAQ" ? "Enter answer" : 
                                 formData.type === "SOS assistants" ? "Phone number: +1-234-567-8900\nAdditional information..." : 
                                 "Enter description"}
                    className={`bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[150px] ${errors.description ? 'border-red-500' : ''}`}
                  />
                  {errors.description && (
                    <p className="mt-1 text-xs text-red-400">{errors.description}</p>
                  )}
                  
                  {/* Phone number format validation hint for SOS assistants */}
                  {formData.type === "SOS assistants" && (
                    <div className="text-xs text-indigo-300">
                      <p>Please include a valid phone number in international format</p>
                      <p>Example: Phone number: +1-234-567-8900</p>
                </div>
              )}
            </div>
              )}
              
              {/* Location Section */}
              {visibleComponents.address && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-white/70">
                    Location Address
                    {(['Event', 'Food & Beverage', 'Accommodation', 'Entertainment'].includes(formData.type || '')) && (
                      <span className="text-red-400">*</span>
                    )}
                  </label>
                  
                  {/* Import GoongMapsAutocomplete component */}
                  <div className="mt-2">
                    <GoongMapsAutocomplete
                      value={formData.address}
                      onChange={(address, latLng) => {
                        handleAddressChange(address, latLng);
                      }}
                      placeholder="Search for a location..."
                      className="w-full"
                      showMap={true}
                    />
                    {errors.address && (
                      <p className="mt-1 text-xs text-red-400">{errors.address}</p>
                    )}
                  </div>
                  
                  <div className="text-xs text-indigo-300 mt-1">
                    <p>Search for an address or drag the marker to set the exact location</p>
                  </div>
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

