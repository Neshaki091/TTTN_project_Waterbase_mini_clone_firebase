const storageService = require('../services/storage.service');
const storageMapper = require('../mappers/storage.mapper');

exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const result = await storageService.uploadFile(req.appId, req.file);
        res.status(201).json({
            message: 'File uploaded successfully',
            file: storageMapper.toDTO(req.appId, result.fileName, result.stats, result.originalName)
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'File upload failed', error: error.message });
    }
};

exports.listFiles = async (req, res) => {
    try {
        const files = await storageService.listFiles(req.appId);
        res.json({ files: storageMapper.toDTOList(req.appId, files) });
    } catch (error) {
        console.error('List files error:', error);
        res.status(500).json({ message: 'Failed to list files', error: error.message });
    }
};

exports.getFile = async (req, res) => {
    try {
        const { appId, filename } = req.params;
        const filePath = await storageService.getFile(appId, filename);
        res.sendFile(filePath);
    } catch (error) {
        const status = error.message === 'File not found' ? 404 : 500;
        res.status(status).json({ message: error.message });
    }
};

exports.deleteFile = async (req, res) => {
    try {
        await storageService.deleteFile(req.appId, req.params.filename);
        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        const status = error.message === 'File not found' ? 404 : 500;
        res.status(status).json({ message: error.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        const stats = await storageService.getStats(req.appId);
        res.json({
            totalFiles: stats.count,
            totalSize: stats.size,
            usedBytes: stats.size
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ message: 'Failed to get stats', error: error.message });
    }
};
