export interface AdminInputKnowledgeItem {
  id?: number;
  name: string;
  address: string;
  description: string;
  price: string;
  time: string;
  date: string;
  type: string;
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
  type: string
  price?: string
  date?: string
  time?: string
  image?: string | null
  location?: string // JSON string with lat/lng data
  created_at: string
  updated_at: string
  category?: string
}

// Update API URL to point to the deployed Hugging Face Space
const API_URL = 'https://zok213-teleadmindb.hf.space/api';

export const initDB = async (): Promise<void> => {
  // No initialization needed on client side
  return Promise.resolve();
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
    return data;
  } catch (error) {
    console.error('Error fetching items:', error);
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
};

export const createItem = async (item: AdminInputKnowledgeItem): Promise<AdminInputKnowledgeItem> => {
  try {
    console.log('Creating new item:', item);
    const response = await fetch(`${API_URL}/knowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(item),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Server responded with status ${response.status}:`, errorText);
      throw new Error(`Failed to create item: ${response.statusText} (${response.status})`);
    }
    
    const data = await response.json();
    console.log('Successfully created item:', data);
    return data;
  } catch (error) {
    console.error('Error creating item:', error);
    throw error;
  }
};

export const updateItem = async (id: number, item: AdminInputKnowledgeItem): Promise<AdminInputKnowledgeItem> => {
  try {
    console.log(`Updating item ${id}:`, item);
    const response = await fetch(`${API_URL}/knowledge/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(item),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Server responded with status ${response.status}:`, errorText);
      throw new Error(`Failed to update item: ${response.statusText} (${response.status})`);
    }
    
    const data = await response.json();
    console.log('Successfully updated item:', data);
    return data;
  } catch (error) {
    console.error('Error updating item:', error);
    throw error;
  }
};

export const deleteItem = async (id: number): Promise<void> => {
  try {
    console.log(`Deleting item ${id}`);
    const response = await fetch(`${API_URL}/knowledge/${id}`, {
      method: 'DELETE',
    });
    
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
    return data;
  } catch (error) {
    console.error("Error fetching items:", error);
    throw error;
  }
} 