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

// Available categories from the backend
export const VALID_CATEGORIES = [
  "Event",
  "Accommodation",
  "Food & Drink",
  "Sightseeing Spots",
  "Entertainment",
  "FAQ",           // Changed from "Tips" to "FAQ"
  "SOS assistants", // Changed from "Contact" to "SOS assistants"
  "Custom"
];

// Update API URL to point to the deployed Hugging Face Space
const API_URL = 'https://zok213-teleadmindb.hf.space/api';

// Function to get the active API URL
export const getApiUrl = (): string => {
  return API_URL;
};

// Helper function to map legacy categories to new categories
export const mapCategory = (category: string): string => {
  if (category === "Tips") return "FAQ";
  if (category === "Contact") return "SOS assistants";
  return category;
};

// Helper function to map new categories back to legacy categories for API compatibility
export const mapCategoryForApi = (category: string): string => {
  if (category === "FAQ") return "Tips";
  if (category === "SOS assistants") return "Contact";
  return category;
};

export const initDB = async (): Promise<void> => {
  // No initialization needed on client side
  return Promise.resolve();
};

// Fetch all categories from API
export const getCategories = async (): Promise<string[]> => {
  try {
    console.log('Fetching categories from:', `${API_URL}/categories`);
    const response = await fetch(`${API_URL}/categories`, {
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.error(`Server responded with status ${response.status}`);
      // Fall back to default categories
      return VALID_CATEGORIES;
    }
    
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      // Extract category names from response
      const categoryNames = data.map((cat: { name: string }) => cat.name);
      console.log('Successfully fetched categories:', categoryNames);
      return categoryNames;
    } else {
      console.warn('API returned empty or invalid categories, using defaults');
      return VALID_CATEGORIES;
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
    // Return default categories on error
    return VALID_CATEGORIES;
  }
};

export const getAllItems = async (): Promise<AdminInputKnowledgeItem[]> => {
  try {
    console.log('Fetching items from:', `${API_URL}/knowledge`);
    const response = await fetch(`${API_URL}/knowledge`, {
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
    
    // Transform the data to ensure all required fields exist and properly set category
    return data.map((item: any) => ({
      ...item,
      // Ensure essential fields exist
      id: item.id,
      name: item.name || "",
      address: item.address || "",
      description: item.description || "",
      price: item.price || "",
      time: item.time || "",
      date: item.date || "",
      // Ensure category field is properly set (some items might use type instead) and convert legacy names
      category: mapCategory(item.category || item.type || "Custom"), 
      type: item.type || item.category || "Custom", // Ensure type is also set for backwards compatibility
      image: item.image || null
    }));
  } catch (error) {
    console.error('Error fetching items:', error);
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
};

export const createItem = async (item: AdminInputKnowledgeItem): Promise<AdminInputKnowledgeItem> => {
  try {
    // Map the category for API compatibility
    const preparedItem = {
      ...item,
      // Ensure we're using a valid category and map to legacy categories for API compatibility
      category: mapCategoryForApi(item.category || item.type || "Custom"),
      type: mapCategoryForApi(item.type || item.category || "Custom") // Keep type for backward compatibility
    };

    console.log('Creating new item:', preparedItem);
    
    // Try the new API endpoint first
    let response = await fetch(`${API_URL}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(preparedItem),
    });
    
    // If the new endpoint fails, try the legacy endpoint
    if (!response.ok && (response.status === 404 || response.status === 422)) {
      console.log('New API endpoint failed, trying legacy endpoint');
      response = await fetch(`${API_URL}/knowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(preparedItem),
      });
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Server responded with status ${response.status}:`, errorText);
      throw new Error(`Failed to create item: ${response.statusText} (${response.status})`);
    }
    
    const data = await response.json();
    console.log('Successfully created item:', data);
    
    // Map the returned category from API back to our display format
    return {
      ...data,
      category: mapCategory(data.category)
    };
  } catch (error) {
    console.error('Error creating item:', error);
    throw error;
  }
};

export const updateItem = async (id: number, item: AdminInputKnowledgeItem): Promise<AdminInputKnowledgeItem> => {
  try {
    // Map the category for API compatibility
    const preparedItem = {
      ...item,
      // Ensure we're using a valid category and map to legacy names if needed
      category: mapCategoryForApi(item.category || item.type || "Custom"),
      type: mapCategoryForApi(item.type || item.category || "Custom") // Keep type for backward compatibility
    };

    console.log(`Updating item ${id}:`, preparedItem);
    
    // Try the new API endpoint first
    let response = await fetch(`${API_URL}/items/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(preparedItem),
    });
    
    // If the new endpoint fails, try the legacy endpoint
    if (!response.ok && response.status === 404) {
      console.log(`New API endpoint failed, trying legacy endpoint for item ${id}`);
      response = await fetch(`${API_URL}/knowledge/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(preparedItem),
      });
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Server responded with status ${response.status}:`, errorText);
      throw new Error(`Failed to update item: ${response.statusText} (${response.status})`);
    }
    
    const data = await response.json();
    console.log('Successfully updated item:', data);
    
    // Map the category back to our display format
    return {
      ...data,
      category: mapCategory(data.category)
    };
  } catch (error) {
    console.error('Error updating item:', error);
    throw error;
  }
};

export const deleteItem = async (id: number): Promise<void> => {
  try {
    console.log(`Deleting item ${id}`);
    
    // Try the new API endpoint first
    let response = await fetch(`${API_URL}/items/${id}`, {
      method: 'DELETE',
    });
    
    // If the new endpoint fails, try the legacy endpoint
    if (!response.ok && response.status === 404) {
      console.log(`New API endpoint failed, trying legacy endpoint for item ${id}`);
      response = await fetch(`${API_URL}/knowledge/${id}`, {
        method: 'DELETE',
      });
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Server responded with status ${response.status}:`, errorText);
      throw new Error(`Failed to delete item: ${response.statusText} (${response.status})`);
    }
    
    console.log(`Successfully deleted item ${id}`);
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

// Add fetchItems function for retrieving items from the API
export const fetchItems = async (): Promise<KnowledgeItem[]> => {
  try {
    console.log('Fetching all items from:', `${API_URL}/knowledge`);
    const response = await fetch(`${API_URL}/knowledge`, {
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
    return data.map((item: any) => ({
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
  } catch (error) {
    console.error("Error fetching items:", error);
    throw error;
  }
}

// Check API connectivity
export const checkApiConnectivity = async (): Promise<{connected: boolean; message?: string}> => {
  try {
    console.log('Checking API connectivity at:', `${API_URL}/ping`);
    const response = await fetch(`${API_URL}/ping`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
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