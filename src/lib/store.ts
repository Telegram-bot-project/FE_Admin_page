import { create } from 'zustand';
import { AdminInputKnowledgeItem } from './db';

export interface DatabaseState {
  pendingCreations: AdminInputKnowledgeItem[];
  pendingUpdates: (AdminInputKnowledgeItem & { id: number })[];
  pendingDeletions: Set<number>;
  
  // Actions
  addPendingCreation: (item: AdminInputKnowledgeItem) => void;
  addPendingUpdate: (item: AdminInputKnowledgeItem & { id: number }) => void;
  addPendingDeletion: (itemId: number) => void;
  
  removePendingCreation: (index: number) => void;
  removePendingUpdate: (itemId: number) => void;
  removePendingDeletion: (itemId: number) => void;
  
  clearPendingChanges: () => void;
  hasPendingChanges: () => boolean;
}

export const useDatabase = create<DatabaseState>((set, get) => ({
  pendingCreations: [],
  pendingUpdates: [],
  pendingDeletions: new Set<number>(),
  
  addPendingCreation: (item) => set((state) => ({
    pendingCreations: [...state.pendingCreations, item]
  })),
  
  addPendingUpdate: (item) => set((state) => {
    // Remove any existing update for the same item
    const filtered = state.pendingUpdates.filter(update => update.id !== item.id)
    return {
      pendingUpdates: [...filtered, item]
    }
  }),
  
  addPendingDeletion: (itemId) => set((state) => {
    const newDeletions = new Set(state.pendingDeletions)
    newDeletions.add(itemId)
    
    // Remove any pending update for this item
    const filteredUpdates = state.pendingUpdates.filter(update => update.id !== itemId)
    
    return {
      pendingDeletions: newDeletions,
      pendingUpdates: filteredUpdates
    }
  }),
  
  removePendingCreation: (index) => set((state) => ({
    pendingCreations: state.pendingCreations.filter((_, i) => i !== index)
  })),
  
  removePendingUpdate: (itemId) => set((state) => ({
    pendingUpdates: state.pendingUpdates.filter(update => update.id !== itemId)
  })),
  
  removePendingDeletion: (itemId) => set((state) => {
    const newDeletions = new Set(state.pendingDeletions)
    newDeletions.delete(itemId)
    return {
      pendingDeletions: newDeletions
    }
  }),
  
  clearPendingChanges: () => set({
    pendingCreations: [],
    pendingUpdates: [],
    pendingDeletions: new Set<number>()
  }),
  
  hasPendingChanges: () => {
    const { pendingCreations, pendingUpdates, pendingDeletions } = get()
    return pendingCreations.length > 0 || 
           pendingUpdates.length > 0 || 
           pendingDeletions.size > 0
  }
})); 