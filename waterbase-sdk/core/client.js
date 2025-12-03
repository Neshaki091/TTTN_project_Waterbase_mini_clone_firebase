/**
 * Waterbase SDK v3.0 - HTTP Client
 */

import { NetworkError, AuthError } from './errors.js';

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
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('waterbase_token', token);
        } else {
            localStorage.removeItem('waterbase_token');
        }
    }

    setOwnerToken(token) {
        this.ownerToken = token;
        if (token) {
            localStorage.setItem('waterbase_owner_token', token);
        } else {
            localStorage.removeItem('waterbase_owner_token');
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

                if (response.status === 401 || response.status === 403) {
                    throw new AuthError(errorData.message || 'Authentication failed', response.status);
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
