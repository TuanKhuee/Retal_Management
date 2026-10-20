import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryStore = new Map<string, string>();

/**
 * Safe AsyncStorage wrapper that falls back to in-memory map
 * to guarantee zero unhandled crashes across all platforms.
 */
export const safeStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const val = await AsyncStorage.getItem(key);
      return val ?? memoryStore.get(key) ?? null;
    } catch {
      return memoryStore.get(key) ?? null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    memoryStore.set(key, value);
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      // In-memory already saved
    }
  },

  async removeItem(key: string): Promise<void> {
    memoryStore.delete(key);
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // In-memory already removed
    }
  },
};
