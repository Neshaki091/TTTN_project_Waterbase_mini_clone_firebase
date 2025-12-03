/**
 * Waterbase SDK v3.0 - Database Module
 * Firestore-like database operations for WaterDB
 */

import { DatabaseError, ValidationError } from '../core/errors.js';

class DatabaseModule {
    constructor(client) {
        this.client = client;
    }

    collection(collectionName) {
        return new CollectionReference(this.client, collectionName);
    }
}

class CollectionReference {
    constructor(client, collectionName) {
        this.client = client;
        this.collectionName = collectionName;
    }

    async get(options = {}) {
        const params = new URLSearchParams();

        if (options.where) {
            params.append('where', JSON.stringify(options.where));
        }
        if (options.orderBy) {
            params.append('orderBy', options.orderBy);
        }
        if (options.limit) {
            params.append('limit', options.limit);
        }

        const queryString = params.toString();
        const url = `/api/v1/waterdb/${this.collectionName}${queryString ? '?' + queryString : ''}`;

        const response = await this.client.get(url);
        return response.data || response;
    }

    doc(docId) {
        return new DocumentReference(this.client, this.collectionName, docId);
    }

    async add(data) {
        if (!data || typeof data !== 'object') {
            throw new ValidationError('Document data must be an object');
        }

        const response = await this.client.post(`/api/v1/waterdb/${this.collectionName}`, data);
        return response.data || response;
    }

    where(field, operator, value) {
        return new Query(this.client, this.collectionName).where(field, operator, value);
    }

    orderBy(field, direction = 'asc') {
        return new Query(this.client, this.collectionName).orderBy(field, direction);
    }

    limit(limit) {
        return new Query(this.client, this.collectionName).limit(limit);
    }
}

class DocumentReference {
    constructor(client, collectionName, docId) {
        this.client = client;
        this.collectionName = collectionName;
        this.docId = docId;
    }

    async get() {
        const response = await this.client.get(`/api/v1/waterdb/${this.collectionName}/${this.docId}`);
        return response.data || response;
    }

    async set(data) {
        if (!data || typeof data !== 'object') {
            throw new ValidationError('Document data must be an object');
        }

        const response = await this.client.put(`/api/v1/waterdb/${this.collectionName}/${this.docId}`, data);
        return response.data || response;
    }

    async update(data) {
        if (!data || typeof data !== 'object') {
            throw new ValidationError('Update data must be an object');
        }

        // Backend chỉ hỗ trợ PUT, không có PATCH
        // PUT sẽ merge data, không replace toàn bộ
        const response = await this.client.put(`/api/v1/waterdb/${this.collectionName}/${this.docId}`, data);
        return response.data || response;
    }

    async delete() {
        const response = await this.client.delete(`/api/v1/waterdb/${this.collectionName}/${this.docId}`);
        return response;
    }
}

class Query {
    constructor(client, collectionName) {
        this.client = client;
        this.collectionName = collectionName;
        this.conditions = [];
        this._orderBy = null;
        this._limit = null;
    }

    where(field, operator, value) {
        this.conditions.push({ field, operator, value });
        return this;
    }

    orderBy(field, direction = 'asc') {
        this._orderBy = { field, direction };
        return this;
    }

    limit(limit) {
        this._limit = limit;
        return this;
    }

    async get() {
        const params = new URLSearchParams();

        if (this.conditions.length > 0) {
            params.append('where', JSON.stringify(this.conditions));
        }
        if (this._orderBy) {
            params.append('orderBy', `${this._orderBy.field}:${this._orderBy.direction}`);
        }
        if (this._limit) {
            params.append('limit', this._limit);
        }

        const queryString = params.toString();
        const url = `/api/v1/waterdb/${this.collectionName}${queryString ? '?' + queryString : ''}`;

        const response = await this.client.get(url);
        return response.data || response;
    }
}

export default DatabaseModule;
