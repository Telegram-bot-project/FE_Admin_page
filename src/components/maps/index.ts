export { default as GoongMapsAutocomplete } from './GoongMapsAutocomplete';
export { default as GoongMapsExample } from './GoongMapsExample';
export { default as GoongMapsPage } from './GoongMapsPage';
export { default as FixedSearchInput } from './FixedSearchInput';
export { default as GoongMapsTester } from './GoongMapsTester';
export { default as GoongMapsTesterPage } from './GoongMapsTesterPage';
export { default as EnvChecker } from './EnvChecker';
export { default as EnvStatus } from './EnvStatus';

import { getEnv, hasEnv } from '../../lib/envUtils';
import { getEnvFallback } from '../../lib/envFallback';

// Get API key using multiple methods for redundancy
const getGoongApiKey = (): string => {
  let apiKey = '';
  
  // Try primary method (import.meta.env)
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOONG_MAPS_API_KEY) {
      apiKey = import.meta.env.VITE_GOONG_MAPS_API_KEY;
      console.log('[Maps] Got API key from import.meta.env');
      return apiKey;
    }
  } catch (e) {
    console.warn('[Maps] Error accessing import.meta.env:', e);
  }
  
  // Try using envUtils
  try {
    const envUtilKey = getEnv('VITE_GOONG_MAPS_API_KEY', '');
    if (envUtilKey) {
      apiKey = envUtilKey;
      console.log('[Maps] Got API key from envUtils');
      return apiKey;
    }
  } catch (e) {
    console.warn('[Maps] Error accessing envUtils:', e);
  }
  
  // Try fallback method (direct .env file or hardcoded key)
  try {
    const fallbackKey = getEnvFallback('VITE_GOONG_MAPS_API_KEY');
    if (fallbackKey) {
      apiKey = fallbackKey;
      console.log('[Maps] Got API key from fallback system');
      return apiKey;
    }
  } catch (e) {
    console.warn('[Maps] Error accessing fallback system:', e);
  }
  
  // Last resort - hardcoded key from .env file
  apiKey = 'FnrzDAdXVfnmMEGEvdPqypyAsXh68Gv71lSUOYiM';
  console.warn('[Maps] Using hardcoded API key - this should be a temporary solution!');
  
  return apiKey;
};

// Debug constant to help troubleshoot API issues - with more robust checking
export const DEBUG_INFO = {
  VERSION: '1.0.3',
  // Get the actual value with multiple fallbacks
  GOONG_API_KEY_VALUE: getGoongApiKey(),
  // Check if it exists
  GOONG_API_KEY_AVAILABLE: getGoongApiKey().length > 0
};

// Direct export of the API key for easier debugging and access
export const GOONG_MAPS_API_KEY = DEBUG_INFO.GOONG_API_KEY_VALUE; 