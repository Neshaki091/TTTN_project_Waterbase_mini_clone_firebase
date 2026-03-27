const { nanoid } = require('nanoid');
const waterdbRepository = require('../repositories/waterdb.repository');
const usageService = require('./usage.service');

const sanitizeCollectionName = (name = '') => name.trim().toLowerCase();

exports.listCollections = async (appId) => {
  return waterdbRepository.findDistinctCollections({ appId });
};

exports.listDocuments = async (appId, collection, query = {}) => {
  const parsedCollection = sanitizeCollectionName(collection);
  const { limit = 50, orderBy = 'createdAt', direction = 'desc' } = query;

  return waterdbRepository.findDocuments(
    { appId, collection: parsedCollection },
    { [orderBy]: direction === 'asc' ? 1 : -1 },
    Math.min(Number(limit) || 50, 200)
  );
};

exports.getDocument = async (appId, collection, documentId) => {
  const doc = await waterdbRepository.findOne({
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

  const size = usageService.calculateSize(data);

  const doc = await waterdbRepository.create({
    appId,
    collection: sanitizeCollectionName(collection),
    documentId,
    data,
    UsageService: {
      storageSize: size,
      docCount: 1
    },
    createdBy: user?.id || user?._id || null,
    updatedBy: user?.id || user?._id || null,
  });

  // Track usage update: +size, +1 doc
  await usageService.trackUpdate(appId, 'waterdb', {
    storageDelta: size,
    docDelta: 1
  });

  return doc;
};

exports.updateDocument = async (appId, collection, documentId, payload = {}, user) => {
  const { data: explicitData, ...rest } = payload;
  const data = explicitData ?? rest;

  const filter = { appId, collection: sanitizeCollectionName(collection), documentId };
  const oldDoc = await waterdbRepository.findOne(filter);
  if (!oldDoc) {
    const error = new Error('Document not found');
    error.status = 404;
    throw error;
  }

  const newSize = usageService.calculateSize(data);
  const oldSize = oldDoc.UsageService?.storageSize || 0;
  const storageDelta = newSize - oldSize;

  const doc = await waterdbRepository.update(
    filter,
    {
      data,
      'UsageService.storageSize': newSize,
      updatedBy: user?.id || user?._id || null,
    }
  );

  // Track usage update: delta size, 0 doc change
  if (storageDelta !== 0) {
    await usageService.trackUpdate(appId, 'waterdb', {
      storageDelta,
      docDelta: 0
    });
  }

  return doc;
};

exports.deleteDocument = async (appId, collection, documentId) => {
  const filter = {
    appId,
    collection: sanitizeCollectionName(collection),
    documentId,
  };
  const doc = await waterdbRepository.deleteOne(filter);

  if (!doc) {
    const error = new Error('Document not found');
    error.status = 404;
    throw error;
  }

  // Track usage update: -size, -1 doc
  const size = doc.UsageService?.storageSize || 0;
  await usageService.trackUpdate(appId, 'waterdb', {
    storageDelta: -size,
    docDelta: -1
  });

  return doc;
};

exports.getStats = async (appId) => {
  const totalCollections = (await waterdbRepository.findDistinctCollections({ appId })).length;
  const totalDocuments = await waterdbRepository.countDocuments({ appId });

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
  const result = await waterdbRepository.aggregate([
    { $match: { appId } },
    {
      $project: {
        size: {
          $add: [
            { $bsonSize: { $ifNull: ['$data', {}] } },
            { $strLenBytes: '$documentId' },
            { $strLenBytes: '$collection' },
            { $strLenBytes: '$appId' },
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
  const totalCollections = (await waterdbRepository.findDistinctCollections({})).length;
  const totalDocuments = await waterdbRepository.countDocuments({});
  return { totalCollections, totalDocuments };
};

exports.getAggregateStats = async (appIds) => {
  if (!appIds || appIds.length === 0) return { totalCollections: 0, totalDocuments: 0 };

  const totalCollections = (await waterdbRepository.findDistinctCollections({ appId: { $in: appIds } })).length;
  const totalDocuments = await waterdbRepository.countDocuments({ appId: { $in: appIds } });

  return { totalCollections, totalDocuments };
};

exports.getStatsPerApp = async (appIds) => {
  if (!appIds || appIds.length === 0) return {};

  const stats = await waterdbRepository.aggregate([
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

