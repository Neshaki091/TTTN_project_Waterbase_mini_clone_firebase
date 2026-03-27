const { nanoid } = require('nanoid');
const dynamicDocumentRepository = require('../repositories/dynamicDocument.repository');

const sanitizeCollectionName = (name = '') => name.trim().toLowerCase();

exports.listCollections = async (appId) => {
    return dynamicDocumentRepository.findDistinctCollections(appId);
};

exports.listDocuments = async (appId, collection, query = {}) => {
    const parsedCollection = sanitizeCollectionName(collection);
    const { limit = 50, orderBy = 'createdAt', direction = 'desc' } = query;

    return dynamicDocumentRepository.findDocuments(
        { appId, collection: parsedCollection },
        { [orderBy]: direction === 'asc' ? 1 : -1 },
        Math.min(Number(limit) || 50, 200)
    );
};

exports.getDocument = async (appId, collection, documentId) => {
    const parsedCollection = sanitizeCollectionName(collection);
    const doc = await dynamicDocumentRepository.findByIdOrDocumentId(appId, parsedCollection, documentId);

    if (!doc) {
        const error = new Error('Document not found');
        error.status = 404;
        throw error;
    }

    return doc;
};

exports.createDocument = async (appId, collection, payload = {}, user) => {
    const { documentId: providedId, data: explicitData, ...rest } = payload;
    const documentId = providedId || nanoid(20);
    const data = explicitData ?? rest;

    return dynamicDocumentRepository.create({
        appId,
        collection: sanitizeCollectionName(collection),
        documentId,
        data,
        createdBy: user?.id || user?._id || null,
        updatedBy: user?.id || user?._id || null,
    });
};

exports.updateDocument = async (appId, collection, documentId, payload = {}, user) => {
    const { data: explicitData, ...rest } = payload;
    const data = explicitData ?? rest;
    const parsedCollection = sanitizeCollectionName(collection);

    // Primary update logic (prefer documentId)
    let doc = await dynamicDocumentRepository.findOneAndUpdate(
        { appId, collection: parsedCollection, documentId },
        { data, updatedBy: user?.id || user?._id || null }
    );

    // Fallback if not found by documentId
    if (!doc) {
        doc = await dynamicDocumentRepository.findOneAndUpdate(
            { appId, collection: parsedCollection, _id: documentId },
            { data, updatedBy: user?.id || user?._id || null }
        );
    }

    if (!doc) {
        const error = new Error('Document not found');
        error.status = 404;
        throw error;
    }

    return doc;
};

exports.deleteDocument = async (appId, collection, documentId) => {
    const parsedCollection = sanitizeCollectionName(collection);
    
    let doc = await dynamicDocumentRepository.findOneAndDelete({
        appId,
        collection: parsedCollection,
        documentId
    });

    if (!doc) {
        doc = await dynamicDocumentRepository.findOneAndDelete({
            appId,
            collection: parsedCollection,
            _id: documentId
        });
    }

    if (!doc) {
        const error = new Error('Document not found');
        error.status = 404;
        throw error;
    }

    return doc;
};

exports.getStats = async (appId) => {
    const collections = await dynamicDocumentRepository.findDistinctCollections(appId);
    const totalDocuments = await dynamicDocumentRepository.countDocuments({ appId });
    const { usedBytes } = await exports.getStorageUsage(appId);

    return {
        totalCollections: collections.length,
        totalDocuments,
        usedBytes
    };
};

exports.getStorageUsage = async (appId) => {
    try {
        const documents = await dynamicDocumentRepository.findAllLean({ appId });
        
        let totalSize = 0;
        for (const doc of documents) {
            totalSize += JSON.stringify(doc).length;
        }

        return { usedBytes: totalSize };
    } catch (error) {
        console.error('Error calculating storage usage:', error);
        return { usedBytes: 0 };
    }
};

