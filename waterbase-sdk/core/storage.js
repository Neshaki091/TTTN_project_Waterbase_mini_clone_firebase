/**
 * Storage Adapter - Supports both Web (localStorage) and React Native (AsyncStorage)
 */

class StorageAdapter {
    constructor() {
        this.isReactNative = this._detectReactNative();
        this.storage = this._initStorage();
    }

    _detectReactNative() {
        // Check if running in React Native environment
        return typeof navigator !== 'undefined' &&
            navigator.product === 'ReactNative';
    }

    _initStorage() {
        if (this.isReactNative) {
            // React Native - try to import AsyncStorage
            try {
                // User must install @react-native-async-storage/async-storage
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                return AsyncStorage;
            } catch (error) {
                console.warn('AsyncStorage not found. Please install @react-native-async-storage/async-storage');
                return this._createMemoryStorage();
            }
        } else {
            // Web - use localStorage
            if (typeof localStorage !== 'undefined') {
                return localStorage;
            } else {
                // Fallback to memory storage (for SSR/Node.js)
                return this._createMemoryStorage();
            }
        }
    }

    _createMemoryStorage() {
        // In-memory storage fallback
        const store = {};
        return {
            getItem: async (key) => store[key] || null,
            setItem: async (key, value) => { store[key] = value; },
            removeItem: async (key) => { delete store[key]; }
        };
    }

    async getItem(key) {
        try {
            if (this.isReactNative) {
                return await this.storage.getItem(key);
            } else {
                return this.storage.getItem(key);
            }
        } catch (error) {
            console.error('Storage getItem error:', error);
            return null;
        }
    }

    async setItem(key, value) {
        try {
            if (this.isReactNative) {
                await this.storage.setItem(key, value);
            } else {
                this.storage.setItem(key, value);
            }
        } catch (error) {
            console.error('Storage setItem error:', error);
        }
    }

    async removeItem(key) {
        try {
            if (this.isReactNative) {
                await this.storage.removeItem(key);
            } else {
                this.storage.removeItem(key);
            }
        } catch (error) {
            console.error('Storage removeItem error:', error);
        }
    }

    // Synchronous methods for backward compatibility (Web only)
    getItemSync(key) {
        if (this.isReactNative) {
            throw new Error('Synchronous storage access not supported in React Native. Use getItem() instead.');
        }
        return this.storage.getItem(key);
    }

    setItemSync(key, value) {
        if (this.isReactNative) {
            throw new Error('Synchronous storage access not supported in React Native. Use setItem() instead.');
        }
        this.storage.setItem(key, value);
    }

    removeItemSync(key) {
        if (this.isReactNative) {
            throw new Error('Synchronous storage access not supported in React Native. Use removeItem() instead.');
        }
        this.storage.removeItem(key);
    }
}

// Export singleton instance
export default new StorageAdapter();
