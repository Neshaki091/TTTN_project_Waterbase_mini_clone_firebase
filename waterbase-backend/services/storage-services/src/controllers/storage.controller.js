const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const STORAGE_PATH = process.env.STORAGE_PATH || './storage';

// Ensure storage directory exists
async function ensureDir(dir) {
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
}

// Helper: Get directory size recursively
async function getDirectorySize(dirPath) {
    try {
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        let totalSize = 0;
        let fileCount = 0;

        for (const file of files) {
            const filePath = path.join(dirPath, file.name);
            if (file.isDirectory()) {
                const subDirStats = await getDirectorySize(filePath);
                totalSize += subDirStats.size;
                fileCount += subDirStats.count;
            } else {
                const stats = await fs.stat(filePath);
                totalSize += stats.size;
                fileCount++;
            }
        }
        return { size: totalSize, count: fileCount };
    } catch (err) {
        if (err.code === 'ENOENT') return { size: 0, count: 0 };
        throw err;
    }
}

exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const appId = req.appId;
        const appDir = path.join(STORAGE_PATH, appId);
        await ensureDir(appDir);

        // Move file from temp upload to app storage
        const fileExt = path.extname(req.file.originalname);
        const fileName = `${uuidv4()}${fileExt}`;
        const filePath = path.join(appDir, fileName);

        // Use copyFile + unlink instead of rename to avoid EXDEV errors across devices/volumes
        await fs.copyFile(req.file.path, filePath);
        await fs.unlink(req.file.path);

        const fileStats = await fs.stat(filePath);

        res.status(201).json({
            message: 'File uploaded successfully',
            file: {
                id: fileName,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: fileStats.size,
                url: `/api/v1/storage/${appId}/${fileName}`,
                createdAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'File upload failed', error: error.message });
    }
};

exports.listFiles = async (req, res) => {
    try {
        const appId = req.appId;
        const appDir = path.join(STORAGE_PATH, appId);

        try {
            await fs.access(appDir);
        } catch {
            return res.json({ files: [] });
        }

        const files = await fs.readdir(appDir);
        const fileList = await Promise.all(files.map(async (fileName) => {
            const filePath = path.join(appDir, fileName);
            const stats = await fs.stat(filePath);
            return {
                id: fileName,
                name: fileName,
                size: stats.size,
                url: `/api/v1/storage/${appId}/${fileName}`,
                createdAt: stats.birthtime
            };
        }));

        res.json({ files: fileList });
    } catch (error) {
        console.error('List files error:', error);
        res.status(500).json({ message: 'Failed to list files', error: error.message });
    }
};

exports.getFile = async (req, res) => {
    try {
        const { appId, filename } = req.params;
        // Validate appId matches token if not public (logic depends on requirements, assuming owner/app access)

        const filePath = path.join(STORAGE_PATH, appId, filename);

        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({ message: 'File not found' });
        }

        res.sendFile(path.resolve(filePath));
    } catch (error) {
        console.error('Get file error:', error);
        res.status(500).json({ message: 'Failed to get file' });
    }
};

exports.deleteFile = async (req, res) => {
    try {
        const appId = req.appId;
        const { filename } = req.params;
        const filePath = path.join(STORAGE_PATH, appId, filename);

        try {
            await fs.unlink(filePath);
            res.json({ message: 'File deleted successfully' });
        } catch (err) {
            if (err.code === 'ENOENT') {
                return res.status(404).json({ message: 'File not found' });
            }
            throw err;
        }
    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({ message: 'Failed to delete file', error: error.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        const appId = req.appId;
        const appDir = path.join(STORAGE_PATH, appId);
        const { size, count } = await getDirectorySize(appDir);

        res.json({
            totalFiles: count,
            totalSize: size,
            usedBytes: size
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ message: 'Failed to get stats', error: error.message });
    }
};
