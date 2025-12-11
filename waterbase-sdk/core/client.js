/**
 * Waterbase SDK v3.0 - HTTP Client
 * Compatible with Web and React Native
 */

import { NetworkError, AuthError } from './errors.js';
import storage from './storage.js';

class HttpClient {
    constructor(config) {
        this.config = {
            apiUrl: config.apiUrl,
            appId: config.appId,
            apiKey: config.apiKey,
            timeout: config.timeout || 30000,
            retryAttempts: config.retryAttempts || 3,
            retryDelay: config.retryDelay || 1000,
            debug: config.debug || false
        };

        this.token = null;
        this.ownerToken = null;
        this.refreshToken = null;
        this.ownerRefreshToken = null;
        this.isRefreshing = false;
        this.refreshPromise = null;
    }

    async setToken(token, refreshToken = null) {
        this.token = token;
        if (token) {
            await storage.setItem('waterbase_token', token);
        } else {
            await storage.removeItem('waterbase_token');
        }

        if (refreshToken !== null) {
            this.refreshToken = refreshToken;
            if (refreshToken) {
                await storage.setItem('waterbase_refresh_token', refreshToken);
            } else {
                await storage.removeItem('waterbase_refresh_token');
            }
        }
    }

    async setOwnerToken(token, refreshToken = null) {
        this.ownerToken = token;
        if (token) {
            await storage.setItem('waterbase_owner_token', token);
        } else {
            await storage.removeItem('waterbase_owner_token');
        }

        if (refreshToken !== null) {
            this.ownerRefreshToken = refreshToken;
            if (refreshToken) {
                await storage.setItem('waterbase_owner_refresh_token', refreshToken);
            } else {
                await storage.removeItem('waterbase_owner_refresh_token');
            }
        }
    }

    getHeaders(contentType = 'application/json', useOwnerToken = false) {
        const headers = {
            'x-app-id': this.config.appId
        };

        if (contentType) {
            headers['Content-Type'] = contentType;
        }

        const token = useOwnerToken ? this.ownerToken : this.token;
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else if (this.config.apiKey) {
            headers['x-api-key'] = this.config.apiKey;
        }

        return headers;
    }

    async request(url, options = {}, retryCount = 0) {
        const {
            method = 'GET',
            body = null,
            headers = {},
            useOwnerToken = false,
            contentType = 'application/json'
        } = options;

        const fullUrl = url.startsWith('http') ? url : `${this.config.apiUrl}${url}`;

        const fetchOptions = {
            method,
            headers: {
                ...this.getHeaders(contentType, useOwnerToken),
                ...headers
            }
        };

        if (body) {
            if (body instanceof FormData) {
                delete fetchOptions.headers['Content-Type'];
                fetchOptions.body = body;
            } else {
                fetchOptions.body = JSON.stringify(body);
            }
        }

        if (this.config.debug) {
            console.log(`[Waterbase] ${method} ${fullUrl}`, fetchOptions);
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

            const response = await fetch(fullUrl, {
                ...fetchOptions,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                // Auto-refresh token on 401 Unauthorized
                if (response.status === 401) {
                    const refreshResult = await this._handleTokenRefresh(useOwnerToken);

                    if (refreshResult) {
                        // Retry request with new token
                        if (this.config.debug) {
                            console.log('[Waterbase] Token refreshed, retrying request...');
                        }
                        return this.request(url, options, retryCount);
                    }

                    throw new AuthError(errorData.message || 'Authentication failed', response.status);
                }

                if (response.status === 403) {
                    throw new AuthError(errorData.message || 'Forbidden', response.status);
                }

                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new NetworkError('Request timeout');
            }

            if (error instanceof AuthError) {
                throw error;
            }

            if (retryCount < this.config.retryAttempts) {
                if (this.config.debug) {
                    console.log(`[Waterbase] Retrying request (${retryCount + 1}/${this.config.retryAttempts})...`);
                }

                await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * (retryCount + 1)));
                return this.request(url, options, retryCount + 1);
            }

            if (error.message.includes('fetch')) {
                throw new NetworkError('Network request failed. Please check your connection.');
            }

            throw error;
        }
    }

    /**
     * Handle automatic token refresh with Token Rotation (Firebase-style)
     * @private
     */
    async _handleTokenRefresh(useOwnerToken = false) {
        const refreshToken = useOwnerToken ? this.ownerRefreshToken : this.refreshToken;

        if (!refreshToken) {
            if (this.config.debug) {
                console.log('[Waterbase] No refresh token available');
            }
            return false;
        }

        // Prevent multiple simultaneous refresh requests
        if (this.isRefreshing) {
            if (this.config.debug) {
                console.log('[Waterbase] Waiting for ongoing token refresh...');
            }
            return this.refreshPromise;
        }

        this.isRefreshing = true;

        const endpoint = useOwnerToken
            ? '/api/v1/auth/owners/refresh-token'
            : '/api/v1/auth/users/refresh-token';

        this.refreshPromise = (async () => {
            try {
                if (this.config.debug) {
                    console.log('[Waterbase] Refreshing token automatically...');
                }

                // 🔥 Send OLD refresh token in body
                const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-app-id': this.config.appId
                    },
                    body: JSON.stringify({ refreshToken })
                });

                if (!response.ok) {
                    throw new Error('Token refresh failed');
                }

                const data = await response.json();

                // 🔥 Update BOTH tokens (Token Rotation)
                if (useOwnerToken) {
                    this.ownerToken = data.accessToken;
                    this.ownerRefreshToken = data.refreshToken;  // ← NEW refresh token!
                    await storage.setItem('waterbase_owner_token', data.accessToken);
                    await storage.setItem('waterbase_owner_refresh_token', data.refreshToken);
                } else {
                    this.token = data.accessToken;
                    this.refreshToken = data.refreshToken;  // ← NEW refresh token!
                    await storage.setItem('waterbase_token', data.accessToken);
                    await storage.setItem('waterbase_refresh_token', data.refreshToken);
                }

                if (this.config.debug) {
                    console.log('[Waterbase] Tokens refreshed successfully (with rotation)');
                }

                return true;
            } catch (error) {
                if (this.config.debug) {
                    console.error('[Waterbase] Token refresh failed:', error.message);
                }

                // Clear tokens on refresh failure
                if (useOwnerToken) {
                    await this.setOwnerToken(null, null);
                    await storage.removeItem('waterbase_owner');
                } else {
                    await this.setToken(null, null);
                    await storage.removeItem('waterbase_user');
                }

                return false;
            } finally {
                this.isRefreshing = false;
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
    }

    async get(url, options = {}) {
        return this.request(url, { ...options, method: 'GET' });
    }

    async post(url, body, options = {}) {
        return this.request(url, { ...options, method: 'POST', body });
    }

    async put(url, body, options = {}) {
        return this.request(url, { ...options, method: 'PUT', body });
    }

    async delete(url, options = {}) {
        return this.request(url, { ...options, method: 'DELETE' });
    }

    async patch(url, body, options = {}) {
        return this.request(url, { ...options, method: 'PATCH', body });
    }
}

export default HttpClient;
