/**
 * Waterbase SDK v3.0 - Realtime Module
 * WebSocket-based realtime data subscriptions
 */

import io from 'socket.io-client';

class RealtimeModule {
    constructor(client) {
        this.client = client;
        this.socket = null;
        this.subscriptions = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.isConnected = false;
    }

    _connect() {
        if (this.socket && this.isConnected) {
            return;
        }

        const socketUrl = this.client.config.apiUrl.replace('/api/v1', '');

        this.socket = io(socketUrl, {
            path: '/api/v1/rtwaterdb/socket.io',
            query: {
                appId: this.client.config.appId,
                token: this.client.token || this.client.config.apiKey
            },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: this.maxReconnectAttempts
        });

        this.socket.on('connect', () => {
            this.isConnected = true;
            this.reconnectAttempts = 0;
            if (this.client.config.debug) {
                console.log('[Waterbase Realtime] Connected');
            }

            for (const [collection, callback] of this.subscriptions) {
                this._subscribeToCollection(collection, callback);
            }
        });

        this.socket.on('disconnect', () => {
            this.isConnected = false;
            if (this.client.config.debug) {
                console.log('[Waterbase Realtime] Disconnected');
            }
        });

        this.socket.on('connect_error', (error) => {
            if (this.client.config.debug) {
                console.error('[Waterbase Realtime] Connection error:', error);
            }
        });
    }

    _subscribeToCollection(collection, callback) {
        if (!this.socket) return;

        this.socket.emit('subscribe', { collection });

        // Listen for standardized waterdb:event
        this.socket.on('waterdb:event', (event) => {
            if (event.collection === collection) {
                if (event.type === 'create') {
                    callback({ type: 'created', data: event.data });
                } else if (event.type === 'update') {
                    callback({ type: 'updated', data: event.data });
                } else if (event.type === 'delete') {
                    callback({ type: 'deleted', data: event.data });
                }
            }
        });
    }

    subscribe(collection, callback) {
        if (!collection || typeof callback !== 'function') {
            throw new Error('Collection name and callback are required');
        }

        this._connect();
        this.subscriptions.set(collection, callback);

        if (this.isConnected) {
            this._subscribeToCollection(collection, callback);
        }

        return () => this.unsubscribe(collection);
    }

    unsubscribe(collection) {
        if (this.socket && this.isConnected) {
            this.socket.emit('unsubscribe', { collection });
            this.socket.off(`${collection}:created`);
            this.socket.off(`${collection}:updated`);
            this.socket.off(`${collection}:deleted`);
        }

        this.subscriptions.delete(collection);

        if (this.subscriptions.size === 0) {
            this.disconnect();
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            this.subscriptions.clear();
        }
    }

    isRealtimeConnected() {
        return this.isConnected;
    }
}

export default RealtimeModule;
