import React, { useEffect, useRef, useState } from 'react';
import { Input } from "../ui/input";
import { MapPin, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";

// Use the environment variable for the API key
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface GoogleMapAutocompleteProps {
  value: string;
  onChange: (value: string, latLng?: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
}

interface MapLocation {
  address: string;
  lat: number;
  lng: number;
}

const GoogleMapAutocomplete: React.FC<GoogleMapAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Enter address",
  className = "",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  // Load Google Maps API script
  useEffect(() => {
    // Skip if API is already loaded
    if (window.google && window.google.maps) {
      console.log("Google Maps API already loaded");
      setMapLoaded(true);
      return;
    }

    const loadAPI = async () => {
      try {
        setIsLoading(true);
        
        // Add a timeout to detect slow loading or silent failures
        const timeoutId = setTimeout(() => {
          console.warn("Google Maps API loading timed out after 10 seconds");
          setApiError("Map service failed to load. Using basic address input instead.");
          setUseFallback(true);
          setIsLoading(false);
        }, 10000);
        
        // Register a global callback function that Google will call if there's an error
        window.gm_authFailure = () => {
          console.error("Google Maps authentication error - API key may be invalid or restricted");
          setApiError("Google Maps authentication failed. Using basic address input instead.");
          setUseFallback(true);
          setIsLoading(false);
          clearTimeout(timeoutId);
        };
        
        // Check if we have an API key
        if (!GOOGLE_MAPS_API_KEY) {
          console.error("No Google Maps API key found in environment variables");
          setApiError("Missing Google Maps configuration. Using basic address input instead.");
          setUseFallback(true);
          setIsLoading(false);
          clearTimeout(timeoutId);
          return;
        }
        
        const googleMapScript = document.createElement('script');
        googleMapScript.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap&v=quarterly`;
        googleMapScript.async = true;
        googleMapScript.defer = true;
        
        // Define global init function
        window.initMap = () => {
          console.log("Google Maps API initialized successfully");
          clearTimeout(timeoutId);
          setMapLoaded(true);
          setIsLoading(false);
        };
        
        // Add additional error handling
        googleMapScript.onerror = (error) => {
          console.error("Failed to load Google Maps script:", error);
          setApiError("Could not load map service. Using basic address input instead.");
          setUseFallback(true);
          setIsLoading(false);
          clearTimeout(timeoutId);
        };
        
        document.body.appendChild(googleMapScript);
      } catch (error) {
        console.error("Error setting up Google Maps:", error);
        setApiError("Error setting up map service. Using basic address input instead.");
        setUseFallback(true);
        setIsLoading(false);
      }
    };
    
    loadAPI();

    return () => {
      // Cleanup logic
      if (window.gm_authFailure) {
        delete window.gm_authFailure;
      }
      if (window.initMap) {
        delete window.initMap;
      }
    };
  }, []);

  // Initialize autocomplete when map is loaded
  useEffect(() => {
    if (mapLoaded && inputRef.current && !useFallback) {
      try {
        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ['geometry', 'formatted_address'],
        });

        autocompleteRef.current.addListener('place_changed', () => {
          try {
            const place = autocompleteRef.current?.getPlace();
            
            if (!place) {
              console.warn("Place data is null or undefined");
              return;
            }
            
            if (!place.geometry) {
              console.warn("No geometry data in the place result");
              return;
            }
            
            if (!place.geometry.location) {
              console.warn("No location data in place geometry");
              return;
            }
            
            const location = {
              address: place.formatted_address || value || '',
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            };
            
            console.log("Selected location:", location);
            setSelectedLocation(location);
            setShowMap(true);
            setError(null);
            onChange(location.address, { lat: location.lat, lng: location.lng });
            
            // Initialize or update map
            initMap(location);
          } catch (placeError) {
            console.error("Error processing place data:", placeError);
            setError("Error processing location data");
          }
        });
        
        console.log("Autocomplete initialized successfully");
      } catch (error) {
        console.error("Error initializing autocomplete:", error);
        setError("Error setting up address search");
        setUseFallback(true);
      }
    }
  }, [mapLoaded, onChange, value, useFallback]);

  // Initialize or update map when location changes
  const initMap = (location: MapLocation) => {
    if (!mapRef.current || useFallback) return;

    try {
      setIsLoading(true);
      const position = { lat: location.lat, lng: location.lng };

      if (!mapInstanceRef.current) {
        // Create map if it doesn't exist
        mapInstanceRef.current = new google.maps.Map(mapRef.current, {
          center: position,
          zoom: 15,
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
              featureType: "poi.park",
              elementType: "geometry",
              stylers: [{ color: "#263c3f" }],
            },
            {
              featureType: "poi.park",
              elementType: "labels.text.fill",
              stylers: [{ color: "#6b9a76" }],
            },
            {
              featureType: "road",
              elementType: "geometry",
              stylers: [{ color: "#38414e" }],
            },
            {
              featureType: "road",
              elementType: "geometry.stroke",
              stylers: [{ color: "#212a37" }],
            },
            {
              featureType: "road",
              elementType: "labels.text.fill",
              stylers: [{ color: "#9ca5b3" }],
            },
            {
              featureType: "road.highway",
              elementType: "geometry",
              stylers: [{ color: "#746855" }],
            },
            {
              featureType: "road.highway",
              elementType: "geometry.stroke",
              stylers: [{ color: "#1f2835" }],
            },
            {
              featureType: "road.highway",
              elementType: "labels.text.fill",
              stylers: [{ color: "#f3d19c" }],
            },
            {
              featureType: "transit",
              elementType: "geometry",
              stylers: [{ color: "#2f3948" }],
            },
            {
              featureType: "transit.station",
              elementType: "labels.text.fill",
              stylers: [{ color: "#d59563" }],
            },
            {
              featureType: "water",
              elementType: "geometry",
              stylers: [{ color: "#17263c" }],
            },
            {
              featureType: "water",
              elementType: "labels.text.fill",
              stylers: [{ color: "#515c6d" }],
            },
            {
              featureType: "water",
              elementType: "labels.text.stroke",
              stylers: [{ color: "#17263c" }],
            },
          ],
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          zoomControl: true,
        });

        markerRef.current = new google.maps.Marker({
          position,
          map: mapInstanceRef.current,
          animation: google.maps.Animation.DROP,
        });
        
        console.log("Map initialized successfully");
      } else {
        // Update existing map
        mapInstanceRef.current.setCenter(position);
        if (markerRef.current) {
          markerRef.current.setPosition(position);
        }
        console.log("Map position updated");
      }
      setError(null);
    } catch (error) {
      console.error("Error initializing map:", error);
      setError("Error displaying map");
      setUseFallback(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Update map if a value is preset
  useEffect(() => {
    if (mapLoaded && value && !selectedLocation && !useFallback) {
      // If we have a value but no selected location, geocode the address
      if (window.google && window.google.maps) {
        try {
          setIsLoading(true);
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ address: value }, (results, status) => {
            if (status === "OK" && results && results[0]) {
              const location = {
                address: value,
                lat: results[0].geometry.location.lat(),
                lng: results[0].geometry.location.lng()
              };
              setSelectedLocation(location);
              setShowMap(true);
              setError(null);
              initMap(location);
              console.log("Address geocoded successfully:", location);
            } else {
              // If geocoding fails, just keep the address as text
              console.warn("Geocoding failed for address:", value, "Status:", status);
              if (status === "OVER_QUERY_LIMIT") {
                setApiError("Google Maps quota exceeded. Using basic address input.");
                setUseFallback(true);
              }
            }
            setIsLoading(false);
          });
        } catch (error) {
          console.error("Error geocoding address:", error);
          setIsLoading(false);
          setError("Error loading map for this address");
          setUseFallback(true);
        }
      }
    }
  }, [mapLoaded, value, selectedLocation, useFallback]);

  // Handle direct input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    // If input is cleared, hide the map
    if (!e.target.value) {
      setShowMap(false);
      setSelectedLocation(null);
    }
  };

  // Handle manual refresh button click
  const handleRefreshMap = () => {
    if (value && mapLoaded) {
      setSelectedLocation(null); // Reset selected location to trigger geocoding
      setUseFallback(false); // Try using Maps API again
      setApiError(null);
    }
  };

  // If we're using the fallback, render a simple input field
  if (useFallback) {
    return (
      <div className="space-y-3">
        <div className="relative">
          <Input
            type="text"
            value={value}
            onChange={handleInputChange}
            placeholder={placeholder}
            className={`bg-white/5 border-white/10 text-white placeholder:text-white/40 h-10 pl-10 ${className}`}
          />
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
        </div>
        
        {apiError && (
          <div className="flex items-center gap-2 bg-yellow-900/30 border border-yellow-700/30 rounded p-2 text-xs text-yellow-300">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{apiError}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefreshMap}
              className="ml-auto h-6 px-2 text-xs text-yellow-300 hover:text-yellow-200 hover:bg-yellow-800/20"
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Try again
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`bg-white/5 border-white/10 text-white placeholder:text-white/40 h-10 pl-10 ${className}`}
          disabled={isLoading}
        />
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
        
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-white/40" />
          </div>
        )}
      </div>
      
      {error && (
        <div className="text-sm text-red-400 mt-1 flex items-center">
          <span>{error}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleRefreshMap}
            className="ml-2 h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/10"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      
      {showMap && (
        <div className="relative">
          <div 
            ref={mapRef} 
            className="w-full h-[200px] mt-2 rounded-md overflow-hidden transition-all duration-300 ease-in-out border border-white/10 bg-white/5"
          ></div>
          
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm rounded-md">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                <span className="text-xs text-white/70">Loading map...</span>
              </div>
            </div>
          )}
          
          {/* Location information */}
          {selectedLocation && !isLoading && (
            <div className="absolute bottom-2 left-2 right-2 bg-black/40 backdrop-blur-sm p-2 rounded text-xs text-white/80 border border-white/10">
              <div className="truncate">{selectedLocation.address}</div>
              <div className="flex justify-between text-white/50 text-[10px] mt-1">
                <span>Lat: {selectedLocation.lat.toFixed(6)}</span>
                <span>Lng: {selectedLocation.lng.toFixed(6)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Add these global declarations to make TypeScript happy
declare global {
  interface Window {
    initMap?: () => void;
    gm_authFailure?: () => void;
  }
}

export default GoogleMapAutocomplete; 