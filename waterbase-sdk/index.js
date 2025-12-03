/**
 * Waterbase SDK v3.0
 * 
 * A comprehensive Firebase-like backend SDK for JavaScript
 */

import HttpClient from './core/client.js';
import { ValidationError } from './core/errors.js';
import AuthModule from './modules/auth.js';
import DatabaseModule from './modules/database.js';
import RtDatabaseModule from './modules/rtdb.js';
import StorageModule from './modules/storage.js';
import RealtimeModule from './modules/realtime.js';
import RulesModule from './modules/rules.js';

class Waterbase {
    /**
     * Initialize Waterbase SDK
     * @param {Object} config - Configuration object
     * @param {string} config.apiUrl - API base URL
     * @param {string} config.appId - Application ID
     * @param {string} config.apiKey - API Key (optional)
     * @param {boolean} config.debug - Enable debug logging
     */
    constructor(config = {}) {
        // Try to load from waterbase-service.json if appId not provided
        let finalConfig = config;

        if (!config.appId) {
            const loadedConfig = this._loadServiceConfigSync();
            if (loadedConfig) {
                finalConfig = { ...loadedConfig, ...config };
                if (finalConfig.debug) {
                    console.log('[Waterbase SDK] Loaded config from waterbase-service.json');
                }
            }
        }

        // Validate required config
        if (!finalConfig.appId) {
            throw new ValidationError('appId is required in configuration or waterbase-service.json');
        }

        // Set defaults
        const sdkConfig = {
            apiUrl: finalConfig.apiUrl || 'http://api.waterbase.click',
            appId: finalConfig.appId,
            apiKey: finalConfig.apiKey,
            timeout: finalConfig.timeout || 30000,
            retryAttempts: finalConfig.retryAttempts || 3,
            retryDelay: finalConfig.retryDelay || 1000,
            debug: finalConfig.debug || false
        };

        // Remove trailing slash from apiUrl
        sdkConfig.apiUrl = sdkConfig.apiUrl.replace(/\/$/, '');

        // Initialize HTTP client
        this._client = new HttpClient(sdkConfig);

        // Initialize modules
        this.auth = new AuthModule(this._client);
        this.db = new DatabaseModule(this._client);
        this.rtdb = new RtDatabaseModule(this._client);
        this.storage = new StorageModule(this._client);
        this.realtime = new RealtimeModule(this._client);
        this.rules = new RulesModule(this._client);

        if (sdkConfig.debug) {
            console.log('[Waterbase SDK v3.0] Initialized', {
                apiUrl: sdkConfig.apiUrl,
                appId: sdkConfig.appId
            });
        }
    }

    /**
     * Load service config from waterbase-service.json (synchronous)
     * @private
     */
    _loadServiceConfigSync() {
        try {
            // For Node.js environment
            if (typeof require !== 'undefined') {
                try {
                    const fs = require('fs');
                    const path = require('path');
                    const configPath = path.join(process.cwd(), 'waterbase-service.json');

                    if (fs.existsSync(configPath)) {
                        const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                        return {
                            apiUrl: data.apiUrl,
                            appId: data.appId,
                            apiKey: data.apiKey
                        };
                    }
                } catch (err) {
                    console.warn('[Waterbase SDK] Could not load waterbase-service.json:', err.message);
                }
            }

            // For browser environment - try to fetch from root
            // Note: This requires the file to be served by the web server
            // Users should place waterbase-service.json in the public folder
        } catch (error) {
            console.warn('[Waterbase SDK] Error loading service config:', error.message);
        }
        return null;
    }

    /**
     * Get current SDK version
     * @returns {string} SDK version
     */
    static get version() {
        return '3.0.0';
    }

    /**
     * Get SDK configuration
     * @returns {Object} Current configuration
     */
    getConfig() {
        return { ...this._client.config };
    }
}

// Export SDK class and error classes
export default Waterbase;
export * from './core/errors.js';
