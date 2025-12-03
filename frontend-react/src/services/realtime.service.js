import { io } from 'socket.io-client';
import API_ENDPOINTS from '../config/api.config';

class RealtimeService {
    constructor() {
        this.socket = null;
        this.appId = null;
    }

    connect(appId) {
        if (this.socket && this.appId === appId) {
            return; // Already connected to this app
        }

        if (this.socket) {
            this.disconnect();
        }

        this.appId = appId;
        this.socket = io(API_ENDPOINTS.REALTIME.SOCKET_URL, {
            path: API_ENDPOINTS.REALTIME.PATH,
            query: { appId },
            transports: ['websocket', 'polling'],
        });

        this.socket.on('connect', () => {
            console.log('Connected to Realtime Server');
        });

        this.socket.on('connect_error', (err) => {
            console.error('Realtime connection error:', err);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.appId = null;
        }
    }

    subscribe(collection) {
        if (this.socket && collection) {
            this.socket.emit('subscribe', { collection });
        }
    }

    unsubscribe(collection) {
        if (this.socket && collection) {
            this.socket.emit('unsubscribe', { collection });
        }
    }

    onEvent(callback) {
        if (this.socket) {
            this.socket.on('waterdb:event', callback);
        }
    }

    offEvent(callback) {
        if (this.socket) {
            this.socket.off('waterdb:event', callback);
        }
    }
}

export default new RealtimeService();
