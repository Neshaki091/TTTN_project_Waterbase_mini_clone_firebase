/**
 * Waterbase SDK v3.0 - Error Classes
 */

class WaterbaseError extends Error {
    constructor(message, code, statusCode) {
        super(message);
        this.name = 'WaterbaseError';
        this.code = code;
        this.statusCode = statusCode;
    }
}

class AuthError extends WaterbaseError {
    constructor(message, statusCode = 401) {
        super(message, 'AUTH_ERROR', statusCode);
        this.name = 'AuthError';
    }
}

class NetworkError extends WaterbaseError {
    constructor(message) {
        super(message, 'NETWORK_ERROR', 0);
        this.name = 'NetworkError';
    }
}

class ValidationError extends WaterbaseError {
    constructor(message) {
        super(message, 'VALIDATION_ERROR', 400);
        this.name = 'ValidationError';
    }
}

class DatabaseError extends WaterbaseError {
    constructor(message, statusCode = 500) {
        super(message, 'DATABASE_ERROR', statusCode);
        this.name = 'DatabaseError';
    }
}

class StorageError extends WaterbaseError {
    constructor(message, statusCode = 500) {
        super(message, 'STORAGE_ERROR', statusCode);
        this.name = 'StorageError';
    }
}

export {
    WaterbaseError,
    AuthError,
    NetworkError,
    ValidationError,
    DatabaseError,
    StorageError
};
