declare namespace google {
  namespace maps {
    class Map {
      constructor(element: HTMLElement, options?: MapOptions);
      setCenter(latLng: LatLng | LatLngLiteral): void;
      setZoom(zoom: number): void;
      getCenter(): LatLng;
      getZoom(): number;
    }

    class Marker {
      constructor(options?: MarkerOptions);
      setPosition(latLng: LatLng | LatLngLiteral): void;
      getPosition(): LatLng;
      setMap(map: Map | null): void;
    }

    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
      toJSON(): LatLngLiteral;
    }

    class Geocoder {
      geocode(request: GeocoderRequest, callback: (results: GeocoderResult[], status: GeocoderStatus) => void): void;
    }

    namespace places {
      class Autocomplete {
        constructor(inputElement: HTMLInputElement, options?: AutocompleteOptions);
        getPlace(): PlaceResult;
        bindTo(key: string, target: any): void;
        addListener(eventName: string, handler: Function): void;
      }

      interface AutocompleteOptions {
        fields?: string[];
        types?: string[];
        componentRestrictions?: ComponentRestrictions;
        bounds?: any;
      }

      interface ComponentRestrictions {
        country: string | string[];
      }

      interface PlaceResult {
        place_id?: string;
        formatted_address?: string;
        geometry?: {
          location?: LatLng;
        };
        name?: string;
      }
    }

    interface GeocoderRequest {
      address?: string;
      location?: LatLng | LatLngLiteral;
      placeId?: string;
      bounds?: LatLngBounds | LatLngBoundsLiteral;
      componentRestrictions?: GeocoderComponentRestrictions;
      region?: string;
    }

    interface GeocoderComponentRestrictions {
      country: string | string[];
    }

    interface GeocoderResult {
      address_components: GeocoderAddressComponent[];
      formatted_address: string;
      geometry: GeocoderGeometry;
      place_id: string;
      types: string[];
    }

    interface GeocoderAddressComponent {
      long_name: string;
      short_name: string;
      types: string[];
    }

    interface GeocoderGeometry {
      location: LatLng;
      location_type: GeocoderLocationType;
      viewport: LatLngBounds;
      bounds?: LatLngBounds;
    }

    type GeocoderLocationType = 'APPROXIMATE' | 'GEOMETRIC_CENTER' | 'RANGE_INTERPOLATED' | 'ROOFTOP';
    type GeocoderStatus = 'OK' | 'ZERO_RESULTS' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST' | 'UNKNOWN_ERROR';

    interface MapOptions {
      center?: LatLng | LatLngLiteral;
      zoom?: number;
      mapTypeId?: string;
      mapTypeControl?: boolean;
      fullscreenControl?: boolean;
      streetViewControl?: boolean;
      zoomControl?: boolean;
      styles?: any[];
    }

    interface MarkerOptions {
      position?: LatLng | LatLngLiteral;
      map?: Map;
      title?: string;
      animation?: number;
      draggable?: boolean;
      icon?: string | Icon | Symbol;
    }

    interface Icon {
      url?: string;
      size?: Size;
      scaledSize?: Size;
      origin?: Point;
      anchor?: Point;
      labelOrigin?: Point;
    }

    interface Symbol {
      path: string | number;
      fillColor?: string;
      fillOpacity?: number;
      scale?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
    }

    class Size {
      constructor(width: number, height: number);
      width: number;
      height: number;
    }

    class Point {
      constructor(x: number, y: number);
      x: number;
      y: number;
    }

    namespace event {
      function addListener(instance: any, eventName: string, handler: Function): any;
      function removeListener(listener: any): void;
      function trigger(instance: any, eventName: string, ...args: any[]): void;
    }

    const Animation: {
      DROP: number;
      BOUNCE: number;
    };

    const SymbolPath: {
      CIRCLE: number;
      FORWARD_CLOSED_ARROW: number;
      FORWARD_OPEN_ARROW: number;
      BACKWARD_CLOSED_ARROW: number;
      BACKWARD_OPEN_ARROW: number;
    };

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    interface LatLngBounds {
      contains(latLng: LatLng | LatLngLiteral): boolean;
      extend(latLng: LatLng | LatLngLiteral): void;
      getCenter(): LatLng;
      getNorthEast(): LatLng;
      getSouthWest(): LatLng;
      isEmpty(): boolean;
      toJSON(): LatLngBoundsLiteral;
      toString(): string;
    }

    interface LatLngBoundsLiteral {
      north: number;
      east: number;
      south: number;
      west: number;
    }
  }
} 