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
  // Aggregate to calculate approximate storage size
  const result = await DynamicDocument.aggregate([
    { $match: { appId } },
    {
      $project: {
        // Use $bsonSize to get accurate BSON size of the data object
        // Handle null/undefined data with $ifNull
        size: {
          $add: [
            { $bsonSize: { $ifNull: ['$data', {}] } },
            { $strLenBytes: '$documentId' },
            { $strLenBytes: '$collection' },
            { $strLenBytes: '$appId' },
            100 // Overhead for metadata, timestamps, etc.
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        totalSize: { $sum: '$size' }
      }
    }
  ]);

  const usedBytes = result.length > 0 ? result[0].totalSize : 0;

  return { usedBytes };
};

exports.getSystemStats = async () => {
  const totalCollections = (await DynamicDocument.distinct('collection')).length;
  const totalDocuments = await DynamicDocument.countDocuments();
  return { totalCollections, totalDocuments };
};

exports.getAggregateStats = async (appIds) => {
  if (!appIds || appIds.length === 0) return { totalCollections: 0, totalDocuments: 0 };

  const totalCollections = (await DynamicDocument.distinct('collection', { appId: { $in: appIds } })).length;
  const totalDocuments = await DynamicDocument.countDocuments({ appId: { $in: appIds } });

  return { totalCollections, totalDocuments };
};

exports.getStatsPerApp = async (appIds) => {
  if (!appIds || appIds.length === 0) return {};

  const stats = await DynamicDocument.aggregate([
    { $match: { appId: { $in: appIds } } },
    {
      $group: {
        _id: '$appId',
        totalDocuments: { $sum: 1 },
        collections: { $addToSet: '$collection' }
      }
    },
    {
      $project: {
        _id: 0,
        appId: '$_id',
        totalDocuments: 1,
        totalCollections: { $size: '$collections' }
      }
    }
  ]);

  return stats.reduce((acc, curr) => {
    acc[curr.appId] = {
      totalDocuments: curr.totalDocuments,
      totalCollections: curr.totalCollections
    };
    return acc;
  }, {});
};

