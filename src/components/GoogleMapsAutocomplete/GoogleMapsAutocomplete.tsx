import React, { useEffect, useRef, useState } from 'react';
import { Input } from "../ui/input";
import { MapPin, Loader2, AlertCircle, Search, X } from "lucide-react";
import { Button } from "../ui/button";

// Use environment variable for Google Maps API key
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

interface GoogleMapsAutocompleteProps {
  value?: string;
  initialValue?: string;
  onChange?: (address: string, latLng?: { lat: number; lng: number }) => void;
  onPlaceSelect?: (address: string, latLng?: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
  showMap?: boolean;
}

interface MapLocation {
  address: string;
  lat: number;
  lng: number;
}

const GoogleMapsAutocomplete: React.FC<GoogleMapsAutocompleteProps> = ({
  value,
  initialValue,
  onChange,
  onPlaceSelect,
  placeholder = "Search for an address",
  className = "",
  showMap = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // Use value from props or initialValue as fallback
  const initialInputValue = value || initialValue || "";
  const [inputValue, setInputValue] = useState(initialInputValue);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [isMapVisible, setIsMapVisible] = useState(showMap);
  const [isLoading, setIsLoading] = useState(false);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Helper function to call the correct callback
  const notifyChange = (address: string, latLng?: { lat: number; lng: number }) => {
    if (onChange) onChange(address, latLng);
    if (onPlaceSelect) onPlaceSelect(address, latLng);
  };

  // Load Google Maps API
  useEffect(() => {
    // Skip if already loaded
    if (window.google?.maps) {
      setIsApiLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.gomaps.pro/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setIsApiLoaded(true);
    };
    
    script.onerror = () => {
      setError('Failed to load Google Maps API. Please check your API key.');
    };
    
    document.head.appendChild(script);
    
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // Initialize autocomplete and map
  useEffect(() => {
    if (!isApiLoaded || !inputRef.current) return;
    
    try {
      // Create autocomplete instance
      const autocomplete = new (window.google.maps as any).places.Autocomplete(inputRef.current, {
        fields: ['formatted_address', 'geometry']
      });
      
      // Add place_changed event listener
      (window.google.maps as any).event.addListener(autocomplete, 'place_changed', () => {
        const place = autocomplete.getPlace();
        
        if (!place?.geometry?.location) {
          setError('No location data available for this place');
          return;
        }
        
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || '';
        
        // Update the input value and call the onChange handler
        setInputValue(address);
        notifyChange(address, { lat, lng });
        
        // Initialize the map if showMap is true
        if (showMap) {
          initializeMap(lat, lng);
        }
      });
    } catch (err) {
      console.error('Error initializing autocomplete:', err);
      setError('Error initializing address search');
    }
  }, [isApiLoaded, onChange, onPlaceSelect, showMap]);

  // Initialize map with coordinates
  const initializeMap = (lat: number, lng: number) => {
    if (!mapContainerRef.current || !isApiLoaded) return;
    
    setIsLoading(true);
    
    try {
      // Create map instance
      const map = new (window.google.maps as any).Map(mapContainerRef.current, {
        center: { lat, lng },
        zoom: 15,
        mapTypeControl: true,
        fullscreenControl: true,
        streetViewControl: true,
        zoomControl: true,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
          {
            featureType: "administrative.locality",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
          },
          {
            featureType: "poi",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
          },
          {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#38414e" }],
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#17263c" }],
          },
        ],
      });
      
      // Add marker
      new (window.google.maps as any).Marker({
        position: { lat, lng },
        map,
        icon: {
          path: (window.google.maps as any).SymbolPath?.CIRCLE || 0,
          fillColor: '#6366F1',
          fillOpacity: 1,
          strokeWeight: 0,
          scale: 8
        }
      });
      
      // Store location and show map
      setSelectedLocation({ lat, lng, address: inputValue });
      setIsMapVisible(true);
    } catch (error) {
      console.error("Error initializing map:", error);
      setError("Error displaying map");
    } finally {
      setIsLoading(false);
    }
  };

  // Get current location using browser geolocation
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    
    setIsLoadingLocation(true);
    setError(null);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Use reverse geocoding to get address
          if (window.google?.maps) {
            const geocoder = new (window.google.maps as any).Geocoder();
            
            geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
              if (status === "OK" && results[0]) {
                const address = results[0].formatted_address;
                
                // Update input and state
                setInputValue(address);
                notifyChange(address, { lat, lng });
                
                // Initialize map with new location
                initializeMap(lat, lng);
              } else {
                // If geocoding fails, still show the location on the map but with coordinates
                const coordsText = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
                setInputValue(coordsText);
                notifyChange(coordsText, { lat, lng });
                
                // Initialize map with new location
                initializeMap(lat, lng);
              }
              
              setIsLoadingLocation(false);
            });
          } else {
            // If Google Maps is not loaded, just use coordinates
            const coordsText = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
            setInputValue(coordsText);
            notifyChange(coordsText, { lat, lng });
            
            // Initialize map with new location
            initializeMap(lat, lng);
            setIsLoadingLocation(false);
          }
        } catch (error) {
          console.error("Error getting location:", error);
          setError("Error retrieving current location");
          setIsLoadingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        
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
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // If input is cleared, clear error and notify parent
    if (!newValue.trim()) {
      setError(null);
      notifyChange('', undefined);
    } else {
      // For other changes, just notify parent with the text value
      notifyChange(newValue, undefined);
    }
  };

  // Update input value when the prop changes
  useEffect(() => {
    const newValue = value || initialValue || "";
    if (newValue !== inputValue) {
      setInputValue(newValue);
    }
  }, [value, initialValue, inputValue]);

  // Update map visibility when showMap prop changes
  useEffect(() => {
    setIsMapVisible(showMap);
  }, [showMap]);

  // Handle clear input button
  const handleClearInput = () => {
    setInputValue('');
    notifyChange('', undefined);
    setError(null);
    
    // Hide the map but don't destroy it
    setIsMapVisible(false);
  };

  // Render the component
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative">
        {/* Input field for address search */}
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40 pl-10 pr-10 py-2 h-10"
            disabled={!isApiLoaded || isLoading}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
          
          {/* Clear button */}
          {inputValue && (
            <button
              type="button"
              onClick={handleClearInput}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/70"
              aria-label="Clear address"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Loading state */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
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
      
      {/* Map display only if showMap is true */}
      {isMapVisible && selectedLocation && (
        <div className="relative rounded-md overflow-hidden bg-white/5 border border-white/10">
          {/* Map container */}
          <div 
            ref={mapContainerRef} 
            className="h-[200px] w-full"
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

export default GoogleMapsAutocomplete; 