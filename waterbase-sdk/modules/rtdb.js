/**
 * Waterbase SDK v3.0 - Realtime Database Module (RTWaterDB)
 * High-speed realtime database operations
 */

import { DatabaseError, ValidationError } from '../core/errors.js';

class RtDatabaseModule {
    constructor(client) {
        this.client = client;
    }

    collection(collectionName) {
        return new RtCollectionReference(this.client, collectionName);
    }
}

class RtCollectionReference {
    constructor(client, collectionName) {
        this.client = client;
        this.collectionName = collectionName;
    }

    async get() {
        const response = await this.client.get(`/api/v1/rtwaterdb/${this.collectionName}`);
        return response.data || response;
    }

    doc(docId) {
        return new RtDocumentReference(this.client, this.collectionName, docId);
    }

    async add(data) {
        if (!data || typeof data !== 'object') {
            throw new ValidationError('Document data must be an object');
        }

        const response = await this.client.post(`/api/v1/rtwaterdb/${this.collectionName}`, data);
        return response.data || response;
    }
}

class RtDocumentReference {
    constructor(client, collectionName, docId) {
        this.client = client;
        this.collectionName = collectionName;
        this.docId = docId;
    }

    async get() {
        const response = await this.client.get(`/api/v1/rtwaterdb/${this.collectionName}/${this.docId}`);
        return response.data || response;
    }

    async update(data) {
        if (!data || typeof data !== 'object') {
            throw new ValidationError('Update data must be an object');
        }

        const response = await this.client.put(`/api/v1/rtwaterdb/${this.collectionName}/${this.docId}`, data);
        return response.data || response;
    }

    async delete() {
        const response = await this.client.delete(`/api/v1/rtwaterdb/${this.collectionName}/${this.docId}`);
        return response;
    }
}

export default RtDatabaseModule;
