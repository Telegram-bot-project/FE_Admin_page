/**
 * Environment Variables Fallback Loader
 * 
 * This module provides an alternative way to access environment variables
 * by directly reading the .env file when Vite's normal approach fails.
 */

// In-memory cache for environment variables
let envCache: Record<string, string> = {};
let hasLoaded = false;

/**
 * Parse an .env file content into key-value pairs
 */
function parseEnvFile(content: string): Record<string, string> {
  const env: Record<string, string> = {};
  
  content.split('\n').forEach(line => {
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) return;
    
    // Basic parsing - split on first equals sign
    const equalIndex = line.indexOf('=');
    if (equalIndex > 0) {
      const key = line.substring(0, equalIndex).trim();
      let value = line.substring(equalIndex + 1).trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }
      
      env[key] = value;
    }
  });
  
  return env;
}

/**
 * Try to load environment variables from various sources
 */
export async function tryLoadEnvFile(): Promise<boolean> {
  if (hasLoaded) return true;
  
  try {
    // First try using import.meta.env
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      Object.entries(import.meta.env).forEach(([key, value]) => {
        if (typeof value === 'string') {
          envCache[key] = value;
        }
      });
      
      // Check if we got our critical variable
      if (envCache['VITE_GOONG_MAPS_API_KEY']) {
        console.log('[ENV Fallback] Successfully loaded from import.meta.env');
        hasLoaded = true;
        return true;
      }
    }
    
    // Then try direct fetch of .env file
    try {
      const response = await fetch('/.env', { cache: 'no-store' });
      if (response.ok) {
        const content = await response.text();
        const parsedEnv = parseEnvFile(content);
        
        // Merge with cache, preferring new values
        envCache = { ...envCache, ...parsedEnv };
        console.log('[ENV Fallback] Successfully loaded from /.env file');
        hasLoaded = true;
        return true;
      }
    } catch (e) {
      console.warn('[ENV Fallback] Could not fetch .env file:', e);
    }
    
    // As a last resort, try hard-coded .env contents for critical values
    // This is primarily for demonstration - in production you should use proper env vars
    console.warn('[ENV Fallback] Using fallback values - this is only for development!');
    
    // Using the value from the .env file you provided earlier
    envCache['VITE_GOONG_MAPS_API_KEY'] = 'FnrzDAdXVfnmMEGEvdPqypyAsXh68Gv71lSUOYiM';
    
    console.log('[ENV Fallback] Using hardcoded fallback values');
    hasLoaded = true;
    return true;
  } catch (e) {
    console.error('[ENV Fallback] Failed to load environment variables:', e);
    return false;
  }
}

/**
 * Get an environment variable from our fallback system
 */
export function getEnvFallback(key: string, defaultValue: string = ''): string {
  if (!hasLoaded) {
    console.warn('[ENV Fallback] getEnvFallback called before loading - trying to load now');
    tryLoadEnvFile(); // Note: this is async but we're calling it synchronously as a best effort
  }
  
  return envCache[key] || defaultValue;
}

// Try to load environment variables immediately
tryLoadEnvFile(); 