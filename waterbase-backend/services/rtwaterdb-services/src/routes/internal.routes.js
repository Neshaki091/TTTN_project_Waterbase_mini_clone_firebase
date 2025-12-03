const express = require('express');

module.exports = (io, token) => {
  const router = express.Router();

  router.post('/events', (req, res) => {
    if (!token || req.headers['x-internal-token'] !== token) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { appId, collection, type, documentId, data } = req.body;

    if (!appId) {
      return res.status(400).json({ message: 'Missing appId' });
    }

    const payload = {
      type,
      collection,
      documentId,
      data,
      timestamp: Date.now(),
    };

    io.to(`app:${appId}`).emit('waterdb:event', payload);
    if (collection) {
      io.to(`app:${appId}:collection:${collection.toLowerCase()}`).emit('waterdb:event', payload);
    }

    return res.status(204).send();
  });

  return router;
};

