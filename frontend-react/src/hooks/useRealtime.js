import { useState, useEffect, useCallback } from 'react';
import realtimeService from '../services/realtime.service';

/**
 * Custom hook for realtime database subscriptions
 * @param {string} appId - Application ID
 * @param {string} collection - Collection name to subscribe to
 * @returns {Object} - { events, isConnected, error }
 */
export const useRealtime = (appId, collection) => {
    const [events, setEvents] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!appId) return;

        // Connect to realtime service
        realtimeService.connect(appId);

        // Handle connection status
        const handleConnect = () => {
            setIsConnected(true);
            setError(null);
        };

        const handleDisconnect = () => {
            setIsConnected(false);
        };

        const handleError = (err) => {
            setError(err);
            setIsConnected(false);
        };

        // Listen for events
        const handleEvent = (event) => {
            setEvents(prev => [...prev, { ...event, timestamp: Date.now() }]);
        };

        // Set up listeners
        if (realtimeService.socket) {
            realtimeService.socket.on('connect', handleConnect);
            realtimeService.socket.on('disconnect', handleDisconnect);
            realtimeService.socket.on('connect_error', handleError);
        }

        realtimeService.onEvent(handleEvent);

        // Subscribe to collection if provided
        if (collection) {
            realtimeService.subscribe(collection);
        }

        // Cleanup
        return () => {
            if (collection) {
                realtimeService.unsubscribe(collection);
            }
            realtimeService.offEvent(handleEvent);

            if (realtimeService.socket) {
                realtimeService.socket.off('connect', handleConnect);
                realtimeService.socket.off('disconnect', handleDisconnect);
                realtimeService.socket.off('connect_error', handleError);
            }
        };
    }, [appId, collection]);

    const clearEvents = useCallback(() => {
        setEvents([]);
    }, []);

    return { events, isConnected, error, clearEvents };
};

export default useRealtime;
