/**
 * Environment Variable Utilities
 * 
 * This file provides utilities for safely accessing environment variables
 * and checking if they are properly loaded.
 */

/**
 * Get an environment variable with proper type checking
 * @param key The environment variable key
 * @param defaultValue Optional default value if the environment variable is not found
 * @returns The environment variable value or default value
 */
export const getEnv = <T extends string | boolean | number>(
  key: string, 
  defaultValue?: T
): T | undefined => {
  if (typeof import.meta === 'undefined' || !import.meta.env) {
    console.error(`[ENV] Cannot access import.meta.env for key: ${key}`);
    return defaultValue;
  }
  
  const value = import.meta.env[key];
  
  if (value === undefined || value === null) {
    console.warn(`[ENV] Missing environment variable: ${key}`);
    return defaultValue;
  }
  
  // Handle boolean values
  if (defaultValue === true || defaultValue === false) {
    if (typeof value === 'boolean') return value as T;
    if (value === 'true') return true as T;
    if (value === 'false') return false as T;
    return defaultValue;
  }
  
  // Handle number values
  if (typeof defaultValue === 'number') {
    const num = Number(value);
    return (isNaN(num) ? defaultValue : num) as T;
  }
  
  // Handle string values
  return value as T;
};

/**
 * Verify if a required environment variable exists
 * @param key The environment variable key
 * @returns True if the environment variable exists and is not empty
 */
export const hasEnv = (key: string): boolean => {
  if (typeof import.meta === 'undefined' || !import.meta.env) {
    return false;
  }
  
  const value = import.meta.env[key];
  return value !== undefined && value !== null && value !== '';
};

/**
 * Get all environment variables that match a prefix
 * @param prefix The prefix to match (e.g., 'VITE_')
 * @returns An object with all matching environment variables
 */
export const getAllEnvByPrefix = (prefix: string): Record<string, string> => {
  const result: Record<string, string> = {};
  
  if (typeof import.meta === 'undefined' || !import.meta.env) {
    return result;
  }
  
  Object.keys(import.meta.env).forEach(key => {
    if (key.startsWith(prefix)) {
      result[key] = import.meta.env[key] as string;
    }
  });
  
  return result;
};

// Debug function to check if environment variables are loaded
export const debugEnv = (): void => {
  if (typeof import.meta === 'undefined') {
    console.error('[ENV DEBUG] import.meta is undefined');
    return;
  }
  
  if (!import.meta.env) {
    console.error('[ENV DEBUG] import.meta.env is undefined');
    return;
  }
  
  const viteVars = getAllEnvByPrefix('VITE_');
  console.log('[ENV DEBUG] Found Vite environment variables:', 
    Object.keys(viteVars).length > 0 
      ? Object.keys(viteVars).map(k => `${k}: ${typeof viteVars[k]}`)
      : 'None found'
  );
  
  if (hasEnv('VITE_GOONG_MAPS_API_KEY')) {
    const key = getEnv('VITE_GOONG_MAPS_API_KEY', '');
    console.log(`[ENV DEBUG] VITE_GOONG_MAPS_API_KEY is set (length: ${key?.length || 0})`);
  } else {
    console.error('[ENV DEBUG] VITE_GOONG_MAPS_API_KEY is not set');
  }
};

/**
 * Reload environment variables by forcing a module refresh
 * This can help detect changes to .env files without restarting the server
 */
export const reloadEnvVariables = (): void => {
  console.log("Attempting to reload environment variables");
  try {
    // Log all VITE_ environment variables (masking sensitive values)
    const allEnv = getAllEnvByPrefix('VITE_');
    console.log("Current environment variables:", 
      Object.keys(allEnv).reduce((obj, key) => {
        const value = allEnv[key];
        if (typeof value === 'string' && (key.includes('KEY') || key.includes('SECRET'))) {
          obj[key] = value.length > 8 ? 
            `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : 
            '[masked]';
        } else {
          obj[key] = String(value);
        }
        return obj;
      }, {} as Record<string, string>)
    );
    
    // Check specifically for Goong Maps API key
    const goongKey = getEnv('VITE_GOONG_MAPS_API_KEY', '');
    console.log(`VITE_GOONG_MAPS_API_KEY ${goongKey ? 'is present' : 'is missing'}`);
    if (goongKey) {
      console.log(`API Key length: ${String(goongKey).length}`);
    }
    
    return;
  } catch (error) {
    console.error("Error reloading environment variables:", error);
  }
};

/**
 * Gets the raw value of an environment variable without any processing
 */
export const getRawEnv = (key: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return (import.meta.env as Record<string, string>)[key];
  }
  return undefined;
}; 