/**
 * Waterbase SDK v3.0 - Storage Module
 * File upload and download operations
 */

import { StorageError, ValidationError } from '../core/errors.js';

class StorageModule {
    constructor(client) {
        this.client = client;
    }

    async upload(file, metadata = {}, onProgress = null) {
        if (!(file instanceof File || file instanceof Blob)) {
            throw new ValidationError('First argument must be a File or Blob');
        }

        const formData = new FormData();
        formData.append('file', file);

        if (metadata.path) {
            formData.append('path', metadata.path);
        }
        if (metadata.metadata) {
            formData.append('metadata', JSON.stringify(metadata.metadata));
        }

        const response = await this.client.post('/api/v1/storage/upload', formData, {
            contentType: null
        });

        return response.data || response;
    }

    async download(fileId) {
        if (!fileId) {
            throw new ValidationError('File ID is required');
        }

        // Backend route: GET /:appId/:filename
        const url = `${this.client.config.apiUrl}/api/v1/storage/${this.client.config.appId}/${fileId}`;
        const headers = this.client.getHeaders(null);

        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new StorageError(`Failed to download file: ${response.statusText}`);
        }

        return await response.blob();
    }

    getDownloadUrl(fileId) {
        if (!fileId) {
            throw new ValidationError('File ID is required');
        }

        // Backend route: GET /:appId/:filename
        return `${this.client.config.apiUrl}/api/v1/storage/${this.client.config.appId}/${fileId}`;
    }

    async list(options = {}) {
        const params = new URLSearchParams();

        if (options.path) {
            params.append('path', options.path);
        }
        if (options.limit) {
            params.append('limit', options.limit);
        }

        const queryString = params.toString();
        const url = `/api/v1/storage/files${queryString ? '?' + queryString : ''}`;

        const response = await this.client.get(url);
        return response.data || response;
    }

    async delete(fileId) {
        if (!fileId) {
            throw new ValidationError('File ID is required');
        }

        const response = await this.client.delete(`/api/v1/storage/files/${fileId}`);
        return response;
    }

    async getStats() {
        const response = await this.client.get('/api/v1/storage/stats');
        return response.data || response;
    }
}

export default StorageModule;
