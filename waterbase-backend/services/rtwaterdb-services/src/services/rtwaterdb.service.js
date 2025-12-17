const { nanoid } = require('nanoid');
const DynamicDocument = require('../models/dynamicDocument.model');

const sanitizeCollectionName = (name = '') => name.trim().toLowerCase();

exports.listCollections = async (appId) => {
    return DynamicDocument.distinct('collection', { appId });
};

exports.listDocuments = async (appId, collection, query = {}) => {
    const parsedCollection = sanitizeCollectionName(collection);
    const { limit = 50, orderBy = 'createdAt', direction = 'desc' } = query;

    return DynamicDocument.find({ appId, collection: parsedCollection })
        .sort({ [orderBy]: direction === 'asc' ? 1 : -1 })
        .limit(Math.min(Number(limit) || 50, 200));
};

exports.getDocument = async (appId, collection, documentId) => {
    // Try to find by documentId first, then by _id
    let doc = await DynamicDocument.findOne({
        appId,
        collection: sanitizeCollectionName(collection),
        documentId,
    });

    // If not found by documentId, try MongoDB _id
    if (!doc) {
        doc = await DynamicDocument.findOne({
            appId,
            collection: sanitizeCollectionName(collection),
            _id: documentId,
        });
    }

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

    const doc = await DynamicDocument.create({
        appId,
        collection: sanitizeCollectionName(collection),
        documentId,
        data,
        createdBy: user?.id || user?._id || null,
        updatedBy: user?.id || user?._id || null,
    });

    return doc;
};

exports.updateDocument = async (appId, collection, documentId, payload = {}, user) => {
    const { data: explicitData, ...rest } = payload;
    const data = explicitData ?? rest;

    // Try to update by documentId first
    let doc = await DynamicDocument.findOneAndUpdate(
        {
            appId,
            collection: sanitizeCollectionName(collection),
            documentId,
        },
        {
            data,
            updatedBy: user?.id || user?._id || null,
        },
        { new: true }
    );

    // If not found by documentId, try MongoDB _id
    if (!doc) {
        doc = await DynamicDocument.findOneAndUpdate(
            {
                appId,
                collection: sanitizeCollectionName(collection),
                _id: documentId,
            },
            {
                data,
                updatedBy: user?.id || user?._id || null,
            },
            { new: true }
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
    // Try to delete by documentId first
    let doc = await DynamicDocument.findOneAndDelete({
        appId,
        collection: sanitizeCollectionName(collection),
        documentId,
    });

    // If not found by documentId, try MongoDB _id
    if (!doc) {
        doc = await DynamicDocument.findOneAndDelete({
            appId,
            collection: sanitizeCollectionName(collection),
            _id: documentId,
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
    const totalCollections = (await DynamicDocument.distinct('collection', { appId })).length;
    const totalDocuments = await DynamicDocument.countDocuments({ appId });

    // Calculate storage usage
    const storageUsage = await exports.getStorageUsage(appId);

    return {
        totalCollections,
        totalDocuments,
        usedBytes: storageUsage.usedBytes
    };
};

exports.getStorageUsage = async (appId) => {
    try {
        // Get all documents for this app
        const documents = await DynamicDocument.find({ appId }).lean();

        // Calculate total size
        let totalSize = 0;
        for (const doc of documents) {
            // Estimate size using JSON.stringify
            const jsonSize = JSON.stringify(doc).length;
            totalSize += jsonSize;
        }

        return { usedBytes: totalSize };
    } catch (error) {
        console.error('Error calculating storage usage:', error);
        return { usedBytes: 0 };
    }
};

