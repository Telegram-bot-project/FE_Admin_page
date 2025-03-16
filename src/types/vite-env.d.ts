/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: {
    readonly VITE_GOOGLE_MAPS_API_KEY: string;
    readonly VITE_MAPBOX_ACCESS_TOKEN: string;
    readonly [key: string]: string;
  };
} 