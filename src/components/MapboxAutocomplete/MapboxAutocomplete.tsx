import React, { useEffect, useRef, useState } from 'react';
import { Input } from "../ui/input";
import { MapPin, Loader2, RefreshCw, AlertCircle, Search, X } from "lucide-react";
import { Button } from "../ui/button";
import mapboxgl from 'mapbox-gl';

// Import Mapbox CSS
import 'mapbox-gl/dist/mapbox-gl.css';

// Hardcoded access token for Mapbox
const MAPBOX_ACCESS_TOKEN = "pk.eyJ1Ijoiem9rMjEzIiwiYSI6ImNseWd6N3J2OTA1ZGQybW9ienluZmF2MmUifQ.TBkLBKoHIroarnAAO2v8hw";

// Set the access token for Mapbox
mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

// Da Nang city center coordinates
const DANANG_CENTER = [108.2208, 16.0544];

interface MapboxAutocompleteProps {
  value: string;
  onChange: (address: string, latLng?: { lat: number; lng: number }) => void;
  placeholder?: string;
  className?: string;
}

interface MapLocation {
  address: string;
  lat: number;
  lng: number;
}

interface GeocodingFeature {
  id: string;
  place_name: string;
  center: [number, number];
  text: string;
}

const MapboxAutocomplete: React.FC<MapboxAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Search for an address",
  className = "",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  
  const [inputValue, setInputValue] = useState(value || "");
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodingFeature[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize map when a location is selected
  const initMap = (lng: number, lat: number, address: string) => {
    if (!mapContainerRef.current) return;

    try {
      setIsLoading(true);
      
      // Create a location object
      const location: MapLocation = {
        address,
        lng,
        lat
      };
      
      if (!mapInstanceRef.current) {
        // Create new map
        mapInstanceRef.current = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/dark-v11', // Dark style to match app design
          center: [lng, lat],
          zoom: 14,
          attributionControl: false
        });
        
        // Add navigation controls
        mapInstanceRef.current.addControl(new mapboxgl.NavigationControl({
          showCompass: false
        }), 'top-right');
        
        // Add attribution in a subtle way
        mapInstanceRef.current.addControl(new mapboxgl.AttributionControl({
          compact: true
        }));
        
        // Create marker
        markerRef.current = new mapboxgl.Marker({
          color: '#6366F1', // Indigo color to match the app theme
          draggable: true
        })
          .setLngLat([lng, lat])
          .addTo(mapInstanceRef.current);
          
        // When marker is dragged, update the selected location
        markerRef.current.on('dragend', () => {
          const lngLat = markerRef.current?.getLngLat();
          if (lngLat && location) {
            const updatedLocation: MapLocation = {
              ...location,
              lng: lngLat.lng,
              lat: lngLat.lat
            };
            setSelectedLocation(updatedLocation);
            // Don't update the input value, just the coordinates
            onChange(updatedLocation.address, { lat: updatedLocation.lat, lng: updatedLocation.lng });
          }
        });
        
        // Handle map load
        mapInstanceRef.current.on('load', () => {
          console.log("Map loaded successfully");
          setIsLoading(false);
        });
        
      } else {
        // Update existing map
        mapInstanceRef.current.setCenter([lng, lat]);
        
        if (markerRef.current) {
          markerRef.current.setLngLat([lng, lat]);
        }
        
        setIsLoading(false);
      }
      
      // Store the selected location
      setSelectedLocation(location);
      setShowMap(true);
      
    } catch (error) {
      console.error("Error initializing map:", error);
      setError("Error displaying map");
      setIsLoading(false);
    }
  };

  // Search for places using Mapbox Geocoding API
  const searchPlaces = async (query: string) => {
    if (!query.trim() || !MAPBOX_ACCESS_TOKEN) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Call Mapbox Geocoding API directly
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` + 
        `access_token=${MAPBOX_ACCESS_TOKEN}&` + 
        `country=vn&` + // Limit to Vietnam
        `language=vi&` + // Vietnamese language
        `proximity=${DANANG_CENTER[0]},${DANANG_CENTER[1]}&` + // Bias towards Da Nang
        `limit=5` // Limit results
      );
      
      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        setSearchResults(data.features);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setError("No results found. Try a different search term.");
      }
    } catch (error) {
      console.error("Error searching for places:", error);
      setError("Error searching for places. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Clear results when input is cleared
    if (!newValue.trim()) {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  // Handle selecting a place from search results
  const handleSelectPlace = (feature: GeocodingFeature) => {
    // Update form data with the selected address
    setInputValue(feature.place_name);
    onChange(feature.place_name, { lat: feature.center[1], lng: feature.center[0] });
    
    // Initialize map
    initMap(feature.center[0], feature.center[1], feature.place_name);
    
    // Hide search results
    setShowResults(false);
  };

  // Handle search form submission
  const handleSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchPlaces(inputValue);
  };

  // Update input value when the prop changes
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  // Handle refresh button click
  const handleRefresh = () => {
    setError(null);
    searchPlaces(inputValue);
  };

  // Handle clicks outside of the search results to close them
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchResultsRef.current && 
        !searchResultsRef.current.contains(event.target as Node) &&
        inputRef.current && 
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // When map needs to resize after load
  useEffect(() => {
    if (showMap && mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.resize();
      }, 100);
    }
  }, [showMap]);

  // Clear the search input
  const handleClearInput = () => {
    setInputValue("");
    setSelectedLocation(null);
    setShowResults(false);
    onChange(""); // Call onChange with empty value
    
    // Cleanup map if it exists
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  };

  return (
    <div className="w-full flex flex-col space-y-2">
      {/* Search input and results container - fixed height regardless of whether results are shown */}
      <div className="relative">
        <form onSubmit={handleSubmitSearch} className="relative">
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder={placeholder}
              className={`w-full h-10 pl-10 pr-10 bg-white/5 border border-white/10 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-500/40 text-white placeholder:text-white/40 ${className}`}
              onClick={() => inputValue && searchPlaces(inputValue)}
            />
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 h-4 w-4" />
            {inputValue && (
              <button
                type="button"
                onClick={handleClearInput}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white"
                aria-label="Clear"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </form>
        
        {/* Search results dropdown - absolutely positioned */}
        {showResults && (
          <div 
            ref={searchResultsRef}
            className="absolute z-50 w-full mt-1 bg-white/5 border border-white/10 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
                <span className="ml-2 text-sm text-white/70">Searching...</span>
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-red-400">{error}</div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-sm text-white/50">No results found</div>
            ) : (
              <ul>
                {searchResults.map((result) => (
                  <li key={result.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectPlace(result)}
                      className="w-full text-left p-3 hover:bg-white/10 focus:outline-none focus:bg-white/10 text-sm text-white"
                    >
                      {result.place_name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      
      {/* Map container - always exists but only shown when a location is selected */}
      {selectedLocation && (
        <div 
          ref={mapContainerRef}
          className="h-[250px] w-full rounded-lg overflow-hidden border border-white/10 bg-white/5 mt-2"
        ></div>
      )}
    </div>
  );
};

export default MapboxAutocomplete; 