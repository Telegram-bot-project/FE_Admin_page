import React, { useState, useEffect } from 'react';
import { GoongMapsAutocomplete } from './GoongMapsAutocomplete';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Info, MapPin, Search, Keyboard } from "lucide-react";

interface GoongMapsExampleProps {
  addLogEntry?: (message: string) => void;
}

export const GoongMapsExample: React.FC<GoongMapsExampleProps> = ({ addLogEntry }) => {
  const [address, setAddress] = useState<string>('');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | undefined>(undefined);

  // Log changes for debugging
  useEffect(() => {
    if (addLogEntry && address) {
      addLogEntry(`Address updated: "${address.slice(0, 20)}${address.length > 20 ? '...' : ''}"`);
    }
  }, [address, addLogEntry]);

  useEffect(() => {
    if (addLogEntry && coordinates) {
      addLogEntry(`Coordinates updated: [${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}]`);
    }
  }, [coordinates, addLogEntry]);

  const handleAddressChange = (newAddress: string, latLng?: { lat: number; lng: number }) => {
    setAddress(newAddress);
    setCoordinates(latLng);
    
    if (addLogEntry) {
      addLogEntry(`handleAddressChange called with ${latLng ? 'coordinates' : 'no coordinates'}`);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto bg-slate-900 border-slate-800 text-white">
      <CardHeader>
        <CardTitle className="text-xl text-white">Goong Maps Address Search</CardTitle>
        <CardDescription className="text-slate-400">
          Search for an address and select a location on the map
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Search className="h-4 w-4 text-indigo-400" />
            <h3 className="font-medium text-indigo-300">Search Instructions</h3>
          </div>
          <p className="text-sm text-white/80 mb-2">
            Click in the search box below and start typing to search for locations.
          </p>
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Keyboard className="h-3 w-3" />
            <span>Type &amp; select from dropdown</span>
            <MapPin className="h-3 w-3 ml-2" />
            <span>View on map</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label htmlFor="address" className="text-white">Search Address</Label>
            <div className="flex items-center text-xs text-indigo-300 gap-1.5">
              <Info className="h-3.5 w-3.5" />
              <span>Click and type to search</span>
            </div>
          </div>
          
          <GoongMapsAutocomplete
            value={address}
            onChange={handleAddressChange}
            placeholder="Type to search for a location..."
            showMap={true}
            addLogEntry={addLogEntry}
            className="focus-within:ring-1 focus-within:ring-indigo-500 rounded-md"
          />
          
          <div className="text-xs text-slate-400 mt-1 pl-1">
            Examples: "123 Main Street", "Central Park", "Coffee shop near me"
          </div>
        </div>

        {coordinates && (
          <div className="p-4 bg-slate-800 rounded-md">
            <h3 className="text-sm font-medium text-white mb-2">Selected Location Data:</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-400">Address:</span> 
                <span className="ml-2 text-white">{address}</span>
              </div>
              <div>
                <span className="text-slate-400">Latitude:</span> 
                <span className="ml-2 text-white">{coordinates.lat.toFixed(6)}</span>
              </div>
              <div>
                <span className="text-slate-400">Longitude:</span> 
                <span className="ml-2 text-white">{coordinates.lng.toFixed(6)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoongMapsExample; 