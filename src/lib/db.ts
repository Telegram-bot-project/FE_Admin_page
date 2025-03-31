import { SecurityHeaders, SecurityUtils, CSRFUtils } from './security';
import { User } from 'oidc-client-ts';

// Cache management
const cache = {
  items: new Map<string, { data: any, timestamp: number }>(),
  categories: new Map<string, { data: string[], timestamp: number }>(),
  
  // Cache expiration time (5 minutes)
  EXPIRATION: 5 * 60 * 1000,
  
  // Get item from cache or return undefined if expired
  get: (key: string, map: Map<string, { data: any, timestamp: number }>): any | undefined => {
    const cached = map.get(key);
    if (!cached) return undefined;
    
    // Check if cache is expired
    if (Date.now() - cached.timestamp > cache.EXPIRATION) {
      map.delete(key);
      return undefined;
    }
    
    return cached.data;
  },
  
  // Set item in cache
  set: (key: string, data: any, map: Map<string, { data: any, timestamp: number }>): void => {
    map.set(key, { data, timestamp: Date.now() });
  },
  
  // Clear all caches
  clear: (): void => {
    cache.items.clear();
    cache.categories.clear();
  }
};

export interface AdminInputKnowledgeItem {
  id?: number;
  name: string;
  address: string;
  description: string;
  price: string;
  time: string;
  date: string;
  category: string;
  type?: string;    // Keep for backward compatibility
  image: string | null;
  location?: string; // JSON string with lat/lng data
  created_at?: string;
  updated_at?: string;
}

// Add KnowledgeItem interface needed for the DashbroadListing component
export interface KnowledgeItem {
  id: number
  name: string
  description: string
  address: string
  category: string
  type?: string    // Keep for backward compatibility
  price?: string
  date?: string
  time?: string
  image?: string | null
  location?: string // JSON string with lat/lng data
  created_at: string
  updated_at: string
}

// Update VALID_CATEGORIES to match the default categories
export const VALID_CATEGORIES = [
  "Event",
  "Food & Beverage",
  "Accommodation",
  "Sightseeing Spots",
  "Entertainment",
  "FAQ",
  "SOS assistants"
];

// Store for custom categories so they persist across components
const customCategoriesStore = {
  categories: new Set<string>(),
  
  // Add a category
  add: (category: string): void => {
    if (!category || VALID_CATEGORIES.includes(category)) return;
    customCategoriesStore.categories.add(category);
    
    // Also store in localStorage for persistence across page refreshes
    try {
      const stored = localStorage.getItem('customCategories');
      const customCategories = stored ? JSON.parse(stored) : [];
      if (!customCategories.includes(category)) {
        customCategories.push(category);
        localStorage.setItem('customCategories', JSON.stringify(customCategories));
      }
    } catch (error) {
      console.error('Error storing custom category in localStorage:', error);
    }
  },
  
  // Remove a category
  remove: (category: string): void => {
    if (VALID_CATEGORIES.includes(category)) return; // Can't remove default categories
    customCategoriesStore.categories.delete(category);
    
    try {
      const stored = localStorage.getItem('customCategories');
      const customCategories = stored ? JSON.parse(stored) : [];
      const updatedCategories = customCategories.filter((cat: string) => cat !== category);
      localStorage.setItem('customCategories', JSON.stringify(updatedCategories));
    } catch (error) {
      console.error('Error removing category from localStorage:', error);
    }
  },
  
  // Get all categories including custom ones
  getAll: (): string[] => {
    const allCategories = [...VALID_CATEGORIES];
    
    // Add custom categories from localStorage
    try {
      const stored = localStorage.getItem('customCategories');
      const customCategories = stored ? JSON.parse(stored) : [];
      
      // Add any stored categories not already in memory
      customCategories.forEach((category: string) => {
        customCategoriesStore.categories.add(category);
      });
    } catch (error) {
      console.error('Error loading custom categories from localStorage:', error);
    }
    
    // Add from memory store (Set ensures uniqueness)
    customCategoriesStore.categories.forEach(category => {
      if (!allCategories.includes(category)) {
        allCategories.push(category);
      }
    });
    
    return allCategories;
  },
  
  // Check if a category exists
  exists: (category: string): boolean => {
    return VALID_CATEGORIES.includes(category) || customCategoriesStore.categories.has(category);
  }
};

// Export function to add a custom category
export const addCustomCategory = (category: string): void => {
  if (!category.trim()) return;
  customCategoriesStore.add(category.trim());
  
  // Clear any category cache
  cache.categories.clear();
};

// Export function to remove a custom category
export const removeCustomCategory = (category: string): void => {
  if (VALID_CATEGORIES.includes(category)) {
    throw new Error("Cannot remove default category");
  }
  customCategoriesStore.remove(category);
  
  // Clear any category cache
  cache.categories.clear();
};

// Export function to get all categories including custom ones
export const getAllCategories = (): string[] => {
  return customCategoriesStore.getAll();
};

// Export function to check if a category exists
export const categoryExists = (category: string): boolean => {
  return customCategoriesStore.exists(category);
};

// Update API URL to point to the deployed Hugging Face Space
const API_URL = 'https://zok213-teleadmindb.hf.space/api';

// Function to get the active API URL
export const getApiUrl = (): string => {
  return API_URL;
};

// Helper function to map legacy categories to new categories
export const mapCategory = (category: string): string => {
  if (!category) return "Custom";
  if (category === "Tips") return "FAQ";
  if (category === "Contact") return "SOS assistants";
  return category;
};

// Helper function to map new categories back to legacy categories for API compatibility
export const mapCategoryForApi = (category: string): string => {
  if (!category) return "Custom";
  if (category === "FAQ") return "Tips";
  if (category === "SOS assistants") return "Contact";
  return category;
};

// Get secure headers for API requests with optional auth
const getApiHeaders = (contentType = 'application/json', user?: User): HeadersInit => {
  const baseHeaders = SecurityHeaders.getSecureHeaders();
  
  return {
    ...baseHeaders,
    'Content-Type': contentType,
    'Accept': 'application/json',
    'Cache-Control': 'no-cache',
    // Add CSRF token for non-GET requests
    'X-CSRF-Token': CSRFUtils.generateToken()
  };
};

// Enhanced fetch with security implementations and retries
const secureFetch = async (url: string, options: RequestInit = {}, retries = 2): Promise<Response> => {
  // Force HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    SecurityUtils.enforceHttps();
  }
  
  // Add security headers if not provided
  if (!options.headers) {
    options.headers = getApiHeaders();
  }
  
  // Add CSRF token for non-GET methods
  if (options.method && options.method !== 'GET') {
    const csrfToken = CSRFUtils.generateToken();
    CSRFUtils.storeToken('x-csrf-token', csrfToken);
    options.headers = {
      ...options.headers as HeadersInit,
      'X-CSRF-Token': csrfToken
    };
  }
  
  try {
    const response = await fetch(url, options);
    
    // Check for security headers in response
    const contentTypeHeader = response.headers.get('Content-Type');
    const xFrameOptionsHeader = response.headers.get('X-Frame-Options');
    
    if (!contentTypeHeader || !contentTypeHeader.includes('application/json')) {
      console.warn('API response missing proper Content-Type header');
    }
    
    if (!xFrameOptionsHeader) {
      console.warn('API response missing X-Frame-Options header');
    }
    
    // Handle rate limiting
    if (response.status === 429 && retries > 0) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '2', 10);
      console.log(`Rate limited, retrying after ${retryAfter} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return secureFetch(url, options, retries - 1);
    }
    
    // Handle 5xx server errors with retry
    if (response.status >= 500 && retries > 0) {
      console.log(`Server error ${response.status}, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return secureFetch(url, options, retries - 1);
    }
    
    return response;
  } catch (error) {
    // Handle network errors with retry
    if (retries > 0) {
      console.error('Network error, retrying...', error);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return secureFetch(url, options, retries - 1);
    }
    
    console.error('Secure fetch error:', error);
    throw error;
  }
};

export const initDB = async (): Promise<void> => {
  // Clear cache on initialization
  cache.clear();
  return Promise.resolve();
};

// Fetch all categories from API with caching
export const getCategories = async (user?: User): Promise<string[]> => {
  // Check cache first
  const cachedCategories = cache.get('categories', cache.categories);
  if (cachedCategories) {
    console.log('Using cached categories');
    return cachedCategories;
  }
  
  try {
    console.log('Fetching categories from:', `${API_URL}/categories`);
    const response = await secureFetch(`${API_URL}/categories`, {
      headers: getApiHeaders('application/json', user)
    });
    
    if (!response.ok) {
      console.error(`Server responded with status ${response.status}`);
      // Fall back to default categories plus custom ones
      return getAllCategories();
    }
    
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      // Extract category names from response
      const categoryNames = data.map((cat: { name: string }) => cat.name);
      console.log('Successfully fetched categories:', categoryNames);
      
      // Merge with custom categories
      const customCategories = getAllCategories().filter(
        cat => !VALID_CATEGORIES.includes(cat)
      );
      
      // Combine API categories with custom categories
      const mergedCategories = [...new Set([...categoryNames, ...customCategories])];
      
      // Cache the categories
      cache.set('categories', mergedCategories, cache.categories);
      
      return mergedCategories;
    } else {
      console.warn('API returned empty or invalid categories, using defaults plus custom');
      return getAllCategories();
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
    // Return default categories plus custom ones on error
    return getAllCategories();
  }
};

export const getAllItems = async (user?: User, bypassCache = false): Promise<AdminInputKnowledgeItem[]> => {
  // Check cache first unless bypassCache is true
  if (!bypassCache) {
    const cachedItems = cache.get('allItems', cache.items);
    if (cachedItems) {
      console.log('Using cached items');
      return cachedItems;
    }
  }
  
  try {
    console.log('Fetching items from:', `${API_URL}/knowledge`);
    const response = await secureFetch(`${API_URL}/knowledge`, {
      headers: getApiHeaders('application/json', user)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Server responded with status ${response.status}:`, errorText);
      throw new Error(`Failed to fetch items: ${response.statusText} (${response.status})`);
    }
    
    const data = await response.json();
    console.log('Successfully fetched items:', data.length);
    
    // Transform the data to ensure all required fields exist and properly set category
    const processedData = data.map((item: any) => {
      // Log address for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`Item ${item.id} address (original): "${item.address}"`);
      }
      
      // Process and normalize the address
      const cleanAddress = typeof item.address === 'string' ? item.address.trim() : '';
      
      return {
        ...item,
        // Ensure essential fields exist and sanitize user input
        id: item.id,
        name: SecurityUtils.sanitizeInput(item.name || ""),
        address: SecurityUtils.sanitizeInput(cleanAddress),
        description: SecurityUtils.sanitizeInput(item.description || ""),
        price: SecurityUtils.sanitizeInput(item.price || ""),
        time: SecurityUtils.sanitizeInput(item.time || ""),
        date: SecurityUtils.sanitizeInput(item.date || ""),
        // Ensure category field is properly set (some items might use type instead) and convert legacy names
        category: mapCategory(item.category || item.type || "Custom"), 
        type: item.type || item.category || "Custom", // Ensure type is also set for backwards compatibility
        image: item.image || null
      };
    });
    
    // Cache the processed items
    cache.set('allItems', processedData, cache.items);
    
    return processedData;
  } catch (error) {
    console.error('Error fetching items:', error);
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
};

export const createItem = async (item: AdminInputKnowledgeItem, user?: User): Promise<AdminInputKnowledgeItem> => {
  try {
    // Ensure the category exists or is custom
    if (!categoryExists(item.category)) {
      console.log(`Creating new custom category: ${item.category}`);
      
      try {
        // First, create the category in the database
        const categoryCreateInput: CategoryCreateInput = {
          name: item.category,
          description: `Custom category created for item: ${item.name}`
        };
        
        await createCategory(categoryCreateInput);
        console.log(`Successfully created category in database: ${item.category}`);
      } catch (categoryError) {
        console.warn(`Failed to create category in database: ${categoryError}. Continuing with local custom category.`);
      }
      
      // Add to local custom categories
      addCustomCategory(item.category);
    }
    
    // Sanitize user inputs
    const sanitizedItem = {
      ...item,
      name: SecurityUtils.sanitizeInput(item.name),
      address: SecurityUtils.sanitizeInput(typeof item.address === 'string' ? item.address.trim() : ''),
      description: SecurityUtils.sanitizeInput(item.description),
      price: SecurityUtils.sanitizeInput(item.price),
      time: SecurityUtils.sanitizeInput(item.time),
      date: SecurityUtils.sanitizeInput(item.date),
    };
    
    // Map the category for API compatibility
    const preparedItem = {
      ...sanitizedItem,
      // Ensure we're using the category name directly without mapping for custom categories
      category: sanitizedItem.category || "Custom",
      type: sanitizedItem.category || sanitizedItem.type || "Custom" // Keep type for backward compatibility
    };

    console.log('Creating new item:', preparedItem);
    
    // Generate CSRF token
    const csrfToken = CSRFUtils.generateToken();
    CSRFUtils.storeToken('create-item-csrf', csrfToken);
    
    // Try the new API endpoint first
    let response = await secureFetch(`${API_URL}/items`, {
      method: 'POST',
      headers: {
        ...getApiHeaders('application/json', user),
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify(preparedItem),
    });
    
    // If the new endpoint fails, try the legacy endpoint
    if (!response.ok && (response.status === 404 || response.status === 422)) {
      console.log('New API endpoint failed, trying legacy endpoint');
      response = await secureFetch(`${API_URL}/knowledge`, {
        method: 'POST',
        headers: {
          ...getApiHeaders('application/json', user),
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(preparedItem),
      });
    }
    
    // Clean up CSRF token
    CSRFUtils.clearToken('create-item-csrf');
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Server responded with status ${response.status}:`, errorText);
      throw new Error(`Failed to create item: ${response.statusText} (${response.status})`);
    }
    
    const data = await response.json();
    console.log('Successfully created item:', data);
    
    // Invalidate cache after successful create
    cache.clear();
    
    // Map the returned category from API back to our display format
    return {
      ...data,
      category: data.category || item.category // Ensure we use the original category name
    };
  } catch (error) {
    console.error('Error creating item:', error);
    throw error;
  }
};

export const updateItem = async (id: number, item: AdminInputKnowledgeItem, user?: User): Promise<AdminInputKnowledgeItem> => {
  try {
    // Ensure the category exists or is custom
    if (!categoryExists(item.category)) {
      console.log(`Creating new custom category for update: ${item.category}`);
      
      try {
        // First, create the category in the database
        const categoryCreateInput: CategoryCreateInput = {
          name: item.category,
          description: `Custom category created for item update: ${item.name}`
        };
        
        await createCategory(categoryCreateInput);
        console.log(`Successfully created category in database for update: ${item.category}`);
      } catch (categoryError) {
        console.warn(`Failed to create category in database for update: ${categoryError}. Continuing with local custom category.`);
      }
      
      // Add to local custom categories
      addCustomCategory(item.category);
    }
    
    // Sanitize user inputs
    const sanitizedItem = {
      ...item,
      name: SecurityUtils.sanitizeInput(item.name),
      address: SecurityUtils.sanitizeInput(typeof item.address === 'string' ? item.address.trim() : ''),
      description: SecurityUtils.sanitizeInput(item.description),
      price: SecurityUtils.sanitizeInput(item.price),
      time: SecurityUtils.sanitizeInput(item.time),
      date: SecurityUtils.sanitizeInput(item.date),
    };
    
    // Map the category for API compatibility
    const preparedItem = {
      ...sanitizedItem,
      // Ensure we're using the category name directly without mapping for custom categories
      category: sanitizedItem.category || "Custom",
      type: sanitizedItem.category || sanitizedItem.type || "Custom" // Keep type for backward compatibility
    };

    console.log(`Updating item ${id}:`, preparedItem);
    
    // Generate CSRF token
    const csrfToken = CSRFUtils.generateToken();
    CSRFUtils.storeToken('update-item-csrf', csrfToken);
    
    // Try the new API endpoint first
    let response = await secureFetch(`${API_URL}/items/${id}`, {
      method: 'PUT',
      headers: {
        ...getApiHeaders('application/json', user),
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify(preparedItem),
    });
    
    // If the new endpoint fails, try the legacy endpoint
    if (!response.ok && response.status === 404) {
      console.log(`New API endpoint failed, trying legacy endpoint for item ${id}`);
      response = await secureFetch(`${API_URL}/knowledge/${id}`, {
        method: 'PUT',
        headers: {
          ...getApiHeaders('application/json', user),
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(preparedItem),
      });
    }
    
    // Clean up CSRF token
    CSRFUtils.clearToken('update-item-csrf');
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Server responded with status ${response.status}:`, errorText);
      throw new Error(`Failed to update item: ${response.statusText} (${response.status})`);
    }
    
    const data = await response.json();
    console.log('Successfully updated item:', data);
    
    // Invalidate cache after successful update
    cache.clear();
    
    // Map the category back to our display format
    return {
      ...data,
      category: data.category || item.category // Ensure we use the original category name
    };
  } catch (error) {
    console.error('Error updating item:', error);
    throw error;
  }
};

export const deleteItem = async (id: number, user?: User): Promise<void> => {
  try {
    console.log(`Deleting item ${id}`);
    
    // Generate CSRF token
    const csrfToken = CSRFUtils.generateToken();
    CSRFUtils.storeToken('delete-item-csrf', csrfToken);
    
    // Try the new API endpoint first
    let response = await secureFetch(`${API_URL}/items/${id}`, {
      method: 'DELETE',
      headers: {
        ...getApiHeaders('application/json', user),
        'X-CSRF-Token': csrfToken
      }
    });
    
    // If the new endpoint fails, try the legacy endpoint
    if (!response.ok && response.status === 404) {
      console.log(`New API endpoint failed, trying legacy endpoint for item ${id}`);
      response = await secureFetch(`${API_URL}/knowledge/${id}`, {
        method: 'DELETE',
        headers: {
          ...getApiHeaders('application/json', user),
          'X-CSRF-Token': csrfToken
        }
      });
    }
    
    // Clean up CSRF token
    CSRFUtils.clearToken('delete-item-csrf');
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Server responded with status ${response.status}:`, errorText);
      throw new Error(`Failed to delete item: ${response.statusText} (${response.status})`);
    }
    
    console.log(`Successfully deleted item ${id}`);
    
    // Invalidate cache after successful delete
    cache.clear();
  } catch (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
};

/**
 * Helper function to convert a File to base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // The result includes the data URL prefix which we keep for proper content-type handling
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

// Add fetchItems function for retrieving items from the API with caching
export const fetchItems = async (bypassCache = false): Promise<KnowledgeItem[]> => {
  // Check cache first unless bypassCache is true
  if (!bypassCache) {
    const cachedItems = cache.get('fetchItems', cache.items);
    if (cachedItems) {
      console.log('Using cached items for fetchItems');
      return cachedItems;
    }
  }
  
  try {
    console.log('Fetching all items from:', `${API_URL}/knowledge`);
    const response = await secureFetch(`${API_URL}/knowledge`, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Server responded with status ${response.status}:`, errorText);
      throw new Error(`Failed to fetch items: ${response.statusText} (${response.status})`);
    }
    
    const data = await response.json();
    console.log('Successfully fetched items:', data.length);
    
    // Ensure each item has the category field properly set
    const processedData = data.map((item: any) => ({
      ...item,
      // Ensure essential fields exist
      id: item.id,
      name: item.name || "",
      description: item.description || "",
      address: item.address || "",
      // Set category field and convert from legacy names to display names
      category: mapCategory(item.category || item.type || "Custom"),
      type: item.type || item.category || "Custom", // Ensure type is also set for backwards compatibility
      // Optional fields with defaults
      price: item.price || "",
      date: item.date || "",
      time: item.time || "",
      image: item.image || null,
      created_at: item.created_at || "",
      updated_at: item.updated_at || ""
    }));
    
    // Cache the processed items
    cache.set('fetchItems', processedData, cache.items);
    
    return processedData;
  } catch (error) {
    console.error("Error fetching items:", error);
    throw error;
  }
}

// Check API connectivity with retry
export const checkApiConnectivity = async (retries = 2): Promise<{connected: boolean; message?: string}> => {
  try {
    console.log('Checking API connectivity at:', `${API_URL}/ping`);
    const response = await secureFetch(`${API_URL}/ping`, {
      method: 'GET',
      headers: getApiHeaders()
    }, retries);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API ping failed with status ${response.status}:`, errorText);
      return { 
        connected: false, 
        message: `API ping failed: ${response.statusText} (${response.status})` 
      };
    }
    
    const data = await response.json();
    console.log('API ping successful:', data);
    
    return { 
      connected: true,
      message: data.message || "Connected to API"
    };
  } catch (error) {
    console.error('Error checking API connectivity:', error);
    return { 
      connected: false, 
      message: `Failed to connect to API: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};

// Add new interfaces for category management
export interface CategoryCreateInput {
  name: string;
  description: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// Add category API functions
export const createCategory = async (category: CategoryCreateInput): Promise<Category> => {
  try {
    const response = await secureFetch(`${API_URL}/categories`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify(category)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create category: ${response.statusText} (${response.status})\n${errorText}`);
    }

    const data = await response.json();
    
    // Clear category cache
    cache.categories.clear();
    
    return data;
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

export const deleteCategory = async (categoryId: number): Promise<void> => {
  try {
    const response = await secureFetch(`${API_URL}/categories/${categoryId}`, {
      method: 'DELETE',
      headers: getApiHeaders()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete category: ${response.statusText} (${response.status})\n${errorText}`);
    }

    // Clear category cache
    cache.categories.clear();
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

export const updateCategory = async (categoryId: number, category: CategoryCreateInput): Promise<Category> => {
  try {
    const response = await secureFetch(`${API_URL}/categories/${categoryId}`, {
      method: 'PUT',
      headers: getApiHeaders(),
      body: JSON.stringify(category)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update category: ${response.statusText} (${response.status})\n${errorText}`);
    }

    const data = await response.json();
    
    // Clear category cache
    cache.categories.clear();
    
    return data;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

// Update getCategories to use the new Category interface
export const getCategoriesWithDetails = async (user?: User): Promise<Category[]> => {
  // Check cache first
  const cachedCategories = cache.get('categoriesWithDetails', cache.categories);
  if (cachedCategories) {
    console.log('Using cached detailed categories');
    return cachedCategories;
  }
  
  try {
    console.log('Fetching category details from:', `${API_URL}/categories`);
    const response = await secureFetch(`${API_URL}/categories`, {
      headers: getApiHeaders('application/json', user)
    });
    
    if (!response.ok) {
      console.error(`Server responded with status ${response.status}`);
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (Array.isArray(data)) {
      // Cache the categories
      cache.set('categoriesWithDetails', data, cache.categories);
      return data;
    } else {
      throw new Error('Invalid category data format received from API');
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
}; 