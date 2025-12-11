/**
 * Waterbase SDK v3.0 - Authentication Module
 * Handles user and owner authentication
 * Compatible with Web and React Native
 */

import { AuthError, ValidationError } from '../core/errors.js';
import storage from '../core/storage.js';

class AuthModule {
    constructor(client) {
        this.client = client;
        this.currentUser = null;
        this.currentOwner = null;

        // Load tokens and user data asynchronously
        this._initializeAuth();
    }

    async _initializeAuth() {
        // Load tokens from storage
        this.client.token = await storage.getItem('waterbase_token');
        this.client.ownerToken = await storage.getItem('waterbase_owner_token');
        this.client.refreshToken = await storage.getItem('waterbase_refresh_token');
        this.client.ownerRefreshToken = await storage.getItem('waterbase_owner_refresh_token');

        // Load user data
        const userData = await storage.getItem('waterbase_user');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        }

        const ownerData = await storage.getItem('waterbase_owner');
        if (ownerData) {
            this.currentOwner = JSON.parse(ownerData);
        }
    }

    // ========================================================================
    // USER AUTHENTICATION
    // ========================================================================

    async registerUser(userData) {
        if (!userData.email || !userData.password) {
            throw new ValidationError('Email and password are required');
        }

        const response = await this.client.post('/api/v1/auth/users', userData);

        if (response.accessToken) {
            this.client.setToken(response.accessToken, response.refreshToken);
            this.currentUser = response.user || response;
            await storage.setItem('waterbase_user', JSON.stringify(this.currentUser));
        }

        return response;
    }

    async loginUser(email, password) {
        if (!email || !password) {
            throw new ValidationError('Email and password are required');
        }

        const response = await this.client.post('/api/v1/auth/users/login', {
            email,
            password
        });

        if (response.accessToken) {
            this.client.setToken(response.accessToken, response.refreshToken);
            this.currentUser = response.user || response;
            await storage.setItem('waterbase_user', JSON.stringify(this.currentUser));
        }

        return response;
    }

    async logoutUser() {
        try {
            await this.client.post('/api/v1/auth/users/logout', {});
        } catch (error) {
            console.error('Logout error:', error);
        }

        this.client.setToken(null, null);
        this.currentUser = null;
        await storage.removeItem('waterbase_user');
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return !!this.client.token && !!this.currentUser;
    }

    // ========================================================================
    // OWNER AUTHENTICATION
    // ========================================================================

    async registerOwner(ownerData) {
        if (!ownerData.email || !ownerData.password) {
            throw new ValidationError('Email and password are required');
        }

        const response = await this.client.post('/api/v1/auth/owners', ownerData);

        if (response.accessToken) {
            this.client.setOwnerToken(response.accessToken, response.refreshToken);
            this.currentOwner = response.owner || response;
            localStorage.setItem('waterbase_owner', JSON.stringify(this.currentOwner));
        }

        return response;
    }

    async loginOwner(email, password) {
        if (!email || !password) {
            throw new ValidationError('Email and password are required');
        }

        const response = await this.client.post('/api/v1/auth/owners/login', {
            email,
            password
        });

        if (response.accessToken) {
            this.client.setOwnerToken(response.accessToken, response.refreshToken);
            this.currentOwner = response.owner || response;
            localStorage.setItem('waterbase_owner', JSON.stringify(this.currentOwner));
        }

        return response;
    }

    async logoutOwner() {
        try {
            await this.client.post('/api/v1/auth/owners/logout', {}, { useOwnerToken: true });
        } catch (error) {
            console.error('Owner logout error:', error);
        }

        this.client.setOwnerToken(null, null);
        this.currentOwner = null;
        await storage.removeItem('waterbase_owner');
    }

    getCurrentOwner() {
        return this.currentOwner;
    }

    isOwnerAuthenticated() {
        return !!this.client.ownerToken && !!this.currentOwner;
    }
}

export default AuthModule;
