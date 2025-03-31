import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Loader2, AlertCircle, X, Search } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { GOONG_MAPS_API_KEY } from './index';

// Don't use direct import from env variable - use the centralized one with fallbacks
// const GOONG_MAPS_API_KEY = import.meta.env.VITE_GOONG_MAPS_API_KEY || "";

interface GoongMapsAutocompleteProps {
  value?: string;
  initialValue?: string;
  onChange?: (address: string, latLng?: { lat: number; lng: number }) => void;
  onPlaceSelect?: (address: string, latLng?: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
  showMap?: boolean;
  addLogEntry?: (message: string) => void;
}

interface MapLocation {
  address: string;
  lat: number;
  lng: number;
}

interface SearchResult {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

export const GoongMapsAutocomplete: React.FC<GoongMapsAutocompleteProps> = ({
  value,
  initialValue,
  onChange,
  onPlaceSelect,
  placeholder = "Search for a location...",
  className = "",
  showMap = false,
  addLogEntry,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const lastValueRef = useRef<string>('');
  
  // Use value from props or initialValue as fallback
  const initialInputValue = value || initialValue || "";
  const [inputValue, setInputValue] = useState(initialInputValue);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [isMapVisible, setIsMapVisible] = useState(showMap);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  // Configuration constants
  const MIN_SEARCH_LENGTH = 3;       // Minimum characters before search begins
  const DEBOUNCE_DELAY = 400;        // Milliseconds to wait before searching
  
  // Logger function
  const log = useCallback((message: string) => {
    console.log(`[GoongMapsAutocomplete] ${message}`);
    if (addLogEntry) {
      addLogEntry(message);
    }
  }, [addLogEntry]);

  // Helper function to call the correct callback
  const notifyChange = (address: string, latLng?: { lat: number; lng: number }) => {
    if (onChange) onChange(address, latLng);
    if (onPlaceSelect && latLng) onPlaceSelect(address, latLng);
  };

  // Search for places using the Goong API
  const searchPlaces = useCallback(async (query: string) => {
    // Don't search if input is too short
    if (!query || query.length < MIN_SEARCH_LENGTH || !GOONG_MAPS_API_KEY) {
      if (!query) {
        log('Search canceled: empty query');
      } else if (query.length < MIN_SEARCH_LENGTH) {
        log(`Search query too short (${query.length}/${MIN_SEARCH_LENGTH}): "${query}"`);
      } else {
        log('Search canceled: API key missing');
      }
      
      setSearchResults([]);
      setShowResults(false);
      setIsLoading(false);
      return;
    }

    log(`Searching for: "${query}"`);
    setIsLoading(true);
    setError(null);
    
    try {
      // Use default coordinates if none available
      const defaultCoords = "16.0544068,108.2021667"; // Default coordinates (example)
      
      const url = `https://rsapi.goong.io/place/autocomplete?input=${encodeURIComponent(query)}&location=${defaultCoords}&limit=5&radius=200&api_key=${GOONG_MAPS_API_KEY}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.predictions) {
        log(`Got ${data.predictions.length} results for "${query}"`);
        setSearchResults(data.predictions);
        setShowResults(true);
      } else {
        log(`No results found for "${query}"`);
        setSearchResults([]);
        if (isFocused) {
          setShowResults(true); // Show "no results" message
        }
      }
    } catch (error) {
      console.error("Error searching places:", error);
      log(`Search error: ${error instanceof Error ? error.message : String(error)}`);
      setError("Error searching for locations");
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [log, isFocused, GOONG_MAPS_API_KEY, MIN_SEARCH_LENGTH]);

  // Get current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    
    log('Getting current location...');
    setIsLoadingLocation(true);
    setError(null);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          log(`Location obtained: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          
          // Reverse geocode with Goong API
          const url = `https://rsapi.goong.io/geocode?latlng=${lat},${lng}&api_key=${GOONG_MAPS_API_KEY}`;
          
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.results && data.results.length > 0) {
            const address = data.results[0].formatted_address;
            log(`Reverse geocoded to: "${address}"`);
            
            // Update input and state
            setInputValue(address);
            notifyChange(address, { lat, lng });
            
            // Initialize map with new location
            setSelectedLocation({ lat, lng, address });
            setIsMapVisible(true);
          } else {
            // If geocoding fails, still show the location on the map but with coordinates
            const coordsText = `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            log('No address found for coordinates, using raw coordinates');
            setInputValue(coordsText);
            notifyChange(coordsText, { lat, lng });
            
            // Initialize map with new location
            setSelectedLocation({ lat, lng, address: coordsText });
            setIsMapVisible(true);
          }
        } catch (error) {
          console.error("Error getting location:", error);
          log(`Location error: ${error instanceof Error ? error.message : String(error)}`);
          setError("Error retrieving current location");
        } finally {
          setIsLoadingLocation(false);
          setShowResults(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        log(`Geolocation error: code ${error.code}`);
        
        let errorMessage = "Failed to get your location";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location services.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }
        
        setError(errorMessage);
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [log, notifyChange, GOONG_MAPS_API_KEY]);

  // Handle input changes with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Always update the input value immediately for responsive UI
    setInputValue(newValue);
    
    // Clear previous timer
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    // If input is cleared, clear results and error right away
    if (!newValue.trim()) {
      setSearchResults([]);
      setShowResults(false);
      setError(null);
      notifyChange('', undefined);
      return;
    }
    
    // For short inputs, don't show loading state yet to reduce flicker
    if (newValue.length >= MIN_SEARCH_LENGTH) {
      setIsLoading(true);
    }
    
    // Debounce search to avoid too many API calls
    debounceTimerRef.current = window.setTimeout(() => {
      log(`Debounce complete for: "${newValue}"`);
      searchPlaces(newValue);
    }, DEBOUNCE_DELAY);
    
    // Always notify parent with the text value
    notifyChange(newValue, undefined);
  };
  
  // Handle focus
  const handleFocus = () => {
    log('Input focused');
    setIsFocused(true);
    
    // Show existing results if we have them
    if (inputValue && searchResults.length > 0) {
      setShowResults(true);
    }
    
    // If input is long enough but no results, trigger search
    if (inputValue && inputValue.length >= MIN_SEARCH_LENGTH && searchResults.length === 0) {
      searchPlaces(inputValue);
    }
  };
  
  // Handle blur
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Check if the related target is within our component
    const relatedTarget = e.relatedTarget as Node;
    
    if (containerRef.current && containerRef.current.contains(relatedTarget)) {
      // If clicking within component (like on search results), prevent blur
      log('Internal click detected, preventing blur');
      e.preventDefault();
      
      // Keep focus on input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
      return;
    }
    
    // Otherwise allow blur
    log('Input blurred');
    setIsFocused(false);
    
    // Hide results after a short delay (to allow clicks to register first)
    setTimeout(() => {
      if (!isFocused) {
        setShowResults(false);
      }
    }, 200);
  };

  // Handle selecting a place
  const handleSelectPlace = async (result: SearchResult) => {
    log(`Selected place: ${result.description}`);
    setInputValue(result.description);
    setShowResults(false);
    setIsLoading(true);
    
    try {
      if (!result.place_id || !GOONG_MAPS_API_KEY) {
        setError("Invalid place selected or API key missing");
        setIsLoading(false);
        return;
      }
      
      const url = `https://rsapi.goong.io/place/detail?place_id=${result.place_id}&api_key=${GOONG_MAPS_API_KEY}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.result && data.result.geometry && data.result.geometry.location) {
        const { lat, lng } = data.result.geometry.location;
        const address = data.result.formatted_address || result.description;
        
        log(`Place details: ${address} (${lat}, ${lng})`);
        
        setSelectedLocation({ lat, lng, address });
        setIsMapVisible(true);
        notifyChange(address, { lat, lng });
      } else {
        log('Place details missing location data');
        setError("Could not get location details");
      }
    } catch (error) {
      console.error("Error selecting place:", error);
      log(`Error selecting place: ${error instanceof Error ? error.message : String(error)}`);
      setError("Error selecting location");
    } finally {
      setIsLoading(false);
    }
  };

  // Update input value when the prop changes
  useEffect(() => {
    if (value !== undefined && value !== inputValue) {
      log(`External value updated to: "${value}"`);
      setInputValue(value);
    }
  }, [value, inputValue, log]);

  // Update map visibility when showMap prop changes
  useEffect(() => {
    setIsMapVisible(showMap);
  }, [showMap]);

  // Handle clear input button
  const handleClearInput = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    log('Input cleared');
    setInputValue('');
    setSearchResults([]);
    setShowResults(false);
    setError(null);
    notifyChange('', undefined);
    
    // Hide the map but don't destroy it
    setIsMapVisible(false);
    
    // Refocus the input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Generate Google Maps embed URL
  const getGoogleMapsEmbedUrl = useCallback((lat: number, lng: number): string => {
    return `https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d3000!2d${lng}!3d${lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sus!4v1743329292204!5m2!1sen!2sus`;
  }, []);

  // Render the component
  return (
    <div 
      className={`space-y-2 ${className}`}
      ref={containerRef}
    >
      <div className="relative">
        {/* Input field for address search with custom styling */}
        <div className={`
          relative flex items-center w-full rounded-md bg-white/5 border border-white/10 
          px-3 py-2 h-10 transition-all duration-200
          ${isFocused ? 'ring-1 ring-indigo-500/50 border-indigo-500/30' : ''}
        `}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={isLoadingLocation}
            className="
              flex-1 bg-transparent border-0 outline-none p-0 text-white
              placeholder:text-white/40 focus:outline-none focus:ring-0
            "
            autoComplete="off"
          />
          
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400 ml-2 flex-shrink-0" />
          ) : inputValue ? (
            <button
              type="button"
              onMouseDown={(e) => {
                // Prevent blur during mousedown
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={handleClearInput}
              className="ml-2 text-white/40 hover:text-white/70 p-1 rounded-full hover:bg-white/10"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        
        {/* Helper text showing min chars required */}
        {inputValue && inputValue.length > 0 && inputValue.length < MIN_SEARCH_LENGTH && (
          <div className="absolute right-0 -bottom-5 text-xs text-slate-400">
            Type {MIN_SEARCH_LENGTH - inputValue.length} more character{MIN_SEARCH_LENGTH - inputValue.length !== 1 ? 's' : ''} to search
          </div>
        )}
        
        {/* Results dropdown */}
        {showResults && (
          <div 
            className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg max-h-60 overflow-auto"
            onMouseDown={(e) => e.preventDefault()} // Prevent blur on mousedown
          >
            <ul>
              {searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <li
                    key={result.place_id}
                    className="px-4 py-2 hover:bg-indigo-500/20 cursor-pointer text-white text-sm border-b border-slate-700/50 last:border-0"
                    onClick={() => handleSelectPlace(result)}
                    onMouseDown={(e) => e.preventDefault()} // Prevent blur on mousedown
                  >
                    <div className="font-medium">
                      {result.structured_formatting?.main_text || result.description.split(',')[0]}
                    </div>
                    {(result.structured_formatting?.secondary_text || result.description.split(',').slice(1).join(',')) && (
                      <div className="text-xs text-slate-400">
                        {result.structured_formatting?.secondary_text || result.description.split(',').slice(1).join(',')}
                      </div>
                    )}
                  </li>
                ))
              ) : (
                inputValue.length >= MIN_SEARCH_LENGTH && !isLoading && (
                  <li className="px-4 py-3 text-sm text-slate-300 italic">
                    No results found for "{inputValue}"
                  </li>
                )
              )}
            </ul>
          </div>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-200 text-xs rounded-md px-3 py-2 flex items-start">
          <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            {error}
          </div>
        </div>
      )}
      
      {/* Map display using iframe embed - ONLY if showMap is true and we have a location */}
      {isMapVisible && selectedLocation && (
        <div className="relative rounded-md overflow-hidden bg-white/5 border border-white/10 mt-4">
          <iframe
            src={getGoogleMapsEmbedUrl(selectedLocation.lat, selectedLocation.lng)}
            width="100%"
            height="200"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Google Maps"
            className="w-full"
          />
          
          {/* Map controls overlay */}
          <div className="absolute bottom-2 right-2 flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 py-1 bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs"
              onClick={getCurrentLocation}
              disabled={isLoadingLocation}
            >
              {isLoadingLocation ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <MapPin className="h-3 w-3 mr-1" />
              )}
              Current location
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoongMapsAutocomplete; 