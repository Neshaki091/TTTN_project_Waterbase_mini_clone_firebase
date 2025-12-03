const waterdbService = require('../services/waterdb.service');
const { publishEvent } = require('../utils/realtime.client');

const buildResponse = (doc) => ({
  id: doc.documentId,
  data: doc.data,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

exports.getCollections = async (req, res) => {
  const collections = await waterdbService.listCollections(req.appId);
  res.json({ collections });
};

exports.getCollection = async (req, res) => {
  const docs = await waterdbService.listDocuments(
    req.appId,
    req.params.collectionName,
    req.query
  );
  res.json({
    documents: docs.map(buildResponse),
  });
};

exports.getDocument = async (req, res) => {
  const doc = await waterdbService.getDocument(
    req.appId,
    req.params.collectionName,
    req.params.documentId
  );
  res.json(buildResponse(doc));
};

exports.createDocument = async (req, res) => {
  const doc = await waterdbService.createDocument(
    req.appId,
    req.params.collectionName,
    req.body,
    req.user
  );

  await publishEvent({
    type: 'create',
    appId: req.appId,
    collection: req.params.collectionName,
    documentId: doc.documentId,
    data: doc.data,
  });

  res.status(201).json(buildResponse(doc));
};

exports.updateDocument = async (req, res) => {
  const doc = await waterdbService.updateDocument(
    req.appId,
    req.params.collectionName,
    req.params.documentId,
    req.body,
    req.user
  );

  await publishEvent({
    type: 'update',
    appId: req.appId,
    collection: req.params.collectionName,
    documentId: doc.documentId,
    data: doc.data,
  });

  res.json(buildResponse(doc));
};

exports.deleteDocument = async (req, res) => {
  await waterdbService.deleteDocument(
    req.appId,
    req.params.collectionName,
    req.params.documentId
  );

  await publishEvent({
    type: 'delete',
    appId: req.appId,
    collection: req.params.collectionName,
    documentId: req.params.documentId,
  });

  res.status(204).send();
};

exports.getStats = async (req, res) => {
  const stats = await waterdbService.getStats(req.appId);
  res.json(stats);
};

exports.getSystemStats = async (req, res) => {
  const stats = await waterdbService.getSystemStats();
  res.json(stats);
};

exports.getAggregateStats = async (req, res) => {
  const { appIds } = req.body;
  if (!Array.isArray(appIds)) return res.status(400).json({ message: 'appIds must be an array' });

  const stats = await waterdbService.getAggregateStats(appIds);
  res.json(stats);
};

exports.getStatsPerApp = async (req, res) => {
  const { appIds } = req.body;
  if (!Array.isArray(appIds)) return res.status(400).json({ message: 'appIds must be an array' });

  const stats = await waterdbService.getStatsPerApp(appIds);
  res.json(stats);
};

