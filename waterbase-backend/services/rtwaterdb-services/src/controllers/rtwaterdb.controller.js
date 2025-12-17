const rtwaterdbService = require('../services/rtwaterdb.service');

module.exports = (io) => {
    const emitUpdate = (appId, collection, type, data) => {
        // Emit to room for specific app
        // Clients subscribe to "app:${appId}" room
        io.to(`app:${appId}`).emit('waterdb:event', {
            appId,
            collection,
            type, // 'create', 'update', 'delete'
            data
        });
    };

    return {
        getCollections: async (req, res) => {
            try {
                const collections = await rtwaterdbService.listCollections(req.appId);
                res.json({ collections });
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        },

        getCollection: async (req, res) => {
            try {
                const { collectionName } = req.params;
                const documents = await rtwaterdbService.listDocuments(req.appId, collectionName, req.query);
                res.json({ documents });
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        },

        getDocument: async (req, res) => {
            try {
                const { collectionName, documentId, docId } = req.params;
                const id = documentId || docId; // Support both naming conventions
                const document = await rtwaterdbService.getDocument(req.appId, collectionName, id);
                res.json(document);
            } catch (error) {
                res.status(error.status || 500).json({ message: error.message });
            }
        },

        createDocument: async (req, res) => {
            try {
                const { collectionName } = req.params;
                const document = await rtwaterdbService.createDocument(req.appId, collectionName, req.body, req.user);

                emitUpdate(req.appId, collectionName, 'create', document);

                res.status(201).json(document);
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        },

        updateDocument: async (req, res) => {
            try {
                const { collectionName, documentId, docId } = req.params;
                const id = documentId || docId; // Support both naming conventions
                const document = await rtwaterdbService.updateDocument(req.appId, collectionName, id, req.body, req.user);

                emitUpdate(req.appId, collectionName, 'update', document);

                res.json(document);
            } catch (error) {
                res.status(error.status || 500).json({ message: error.message });
            }
        },

        deleteDocument: async (req, res) => {
            try {
                const { collectionName, documentId, docId } = req.params;
                const id = documentId || docId; // Support both naming conventions
                const document = await rtwaterdbService.deleteDocument(req.appId, collectionName, id);

                emitUpdate(req.appId, collectionName, 'delete', { documentId: id });

                res.json({ message: 'Document deleted successfully' });
            } catch (error) {
                res.status(error.status || 500).json({ message: error.message });
            }
        },

        getStats: async (req, res) => {
            try {
                const stats = await rtwaterdbService.getStats(req.appId);
                res.json(stats);
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        }
    };
};
