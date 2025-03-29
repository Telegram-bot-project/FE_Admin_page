import React, { useState } from 'react';
import { GoogleMapsAutocomplete } from './';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";

const GoogleMapsExample: React.FC = () => {
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | undefined>();

  const handleAddressChange = (newAddress: string, latLng?: { lat: number; lng: number }) => {
    setAddress(newAddress);
    setCoordinates(latLng);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-slate-800 border-slate-700 text-white">
      <CardHeader>
        <CardTitle>Google Maps Location Picker</CardTitle>
        <CardDescription className="text-slate-400">
          Search for an address and select a location on the map
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <GoogleMapsAutocomplete
            value={address}
            onChange={handleAddressChange}
            placeholder="Enter an address or location"
          />
        </div>

        {coordinates && (
          <div className="mt-4 p-3 bg-slate-700/50 rounded-md text-sm">
            <h4 className="font-medium mb-2">Selected Location Data:</h4>
            <pre className="whitespace-pre-wrap text-xs text-slate-300">
              {JSON.stringify({ address, coordinates }, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleMapsExample; 