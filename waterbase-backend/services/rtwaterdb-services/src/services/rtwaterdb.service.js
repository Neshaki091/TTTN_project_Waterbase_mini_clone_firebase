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
    const doc = await DynamicDocument.findOne({
        appId,
        collection: sanitizeCollectionName(collection),
        documentId,
    });

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

    const doc = await DynamicDocument.findOneAndUpdate(
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

    if (!doc) {
        const error = new Error('Document not found');
        error.status = 404;
        throw error;
    }

    return doc;
};

exports.deleteDocument = async (appId, collection, documentId) => {
    const doc = await DynamicDocument.findOneAndDelete({
        appId,
        collection: sanitizeCollectionName(collection),
        documentId,
    });

    if (!doc) {
        const error = new Error('Document not found');
        error.status = 404;
        throw error;
    }

    return doc;
};
