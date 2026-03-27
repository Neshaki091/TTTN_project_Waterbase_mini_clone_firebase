const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fileRepository = require('../repositories/file.repository');
const usageService = require('./usage.service');

const STORAGE_PATH = process.env.STORAGE_PATH || './storage';

/**
 * StorageService handles the business logic for file storage management.
 * Adheres to SRP and DIP.
 */
class StorageService {
  async uploadFile(appId, fileData) {
    const appDir = path.join(STORAGE_PATH, appId);
    await fileRepository.ensureDir(appDir);

    const fileExt = path.extname(fileData.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = path.join(appDir, fileName);

    await fileRepository.copyFile(fileData.path, filePath);
    await fileRepository.unlink(fileData.path);

    const stats = await fileRepository.stat(filePath);

    // Track usage
    await usageService.trackUpdate(appId, {
      storageDelta: stats.size,
      docDelta: 1
    });

    return { fileName, stats, originalName: fileData.originalname, mimeType: fileData.mimetype };
  }

  async listFiles(appId) {
    const appDir = path.join(STORAGE_PATH, appId);
    if (!(await fileRepository.exists(appDir))) return [];

    const fileEntries = await fileRepository.readDir(appDir);
    const fileList = await Promise.all(fileEntries.map(async (entry) => {
      const filePath = path.join(appDir, entry.name);
      const stats = await fileRepository.stat(filePath);
      return { name: entry.name, stats };
    }));

    return fileList;
  }

  async getFile(appId, fileName) {
    const filePath = path.join(STORAGE_PATH, appId, fileName);
    if (!(await fileRepository.exists(filePath))) throw new Error('File not found');
    return fileRepository.resolvePath(filePath);
  }

  async deleteFile(appId, fileName) {
    const filePath = path.join(STORAGE_PATH, appId, fileName);
    if (!(await fileRepository.exists(filePath))) throw new Error('File not found');

    const stats = await fileRepository.stat(filePath);
    await fileRepository.unlink(filePath);

    // Track usage
    await usageService.trackUpdate(appId, {
      storageDelta: -stats.size,
      docDelta: -1
    });

    return true;
  }

  async getStats(appId) {
    const appDir = path.join(STORAGE_PATH, appId);
    const { size, count } = await this._getDirectorySize(appDir);
    return { size, count };
  }

  async getMultipleStatsRPC(appIds) {
    if (!appIds || !Array.isArray(appIds)) return {};

    const statsMap = {};
    await Promise.all(appIds.map(async (appId) => {
      try {
        const stats = await this.getStats(appId);
        statsMap[appId] = {
          totalFiles: stats.count,
          totalSize: stats.size
        };
      } catch (err) {
        statsMap[appId] = { totalFiles: 0, totalSize: 0 };
      }
    }));
    return statsMap;
  }

  async _getDirectorySize(dirPath) {
    try {
      const entries = await fileRepository.readDir(dirPath);
      let totalSize = 0;
      let fileCount = 0;

      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          const subDirStats = await this._getDirectorySize(entryPath);
          totalSize += subDirStats.size;
          fileCount += subDirStats.count;
        } else {
          const stats = await fileRepository.stat(entryPath);
          totalSize += stats.size;
          fileCount++;
        }
      }
      return { size: totalSize, count: fileCount };
    } catch (err) {
      return { size: 0, count: 0 };
    }
  }
}

module.exports = new StorageService();
