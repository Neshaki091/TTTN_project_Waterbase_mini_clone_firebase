const fs = require('fs').promises;
const path = require('path');

/**
 * FileRepository handles direct filesystem interactions.
 * Adheres to SRP and DIP.
 */
class FileRepository {
  async ensureDir(dir) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async exists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async readDir(dirPath) {
    return fs.readdir(dirPath, { withFileTypes: true });
  }

  async stat(filePath) {
    return fs.stat(filePath);
  }

  async copyFile(src, dest) {
    return fs.copyFile(src, dest);
  }

  async unlink(filePath) {
    return fs.unlink(filePath);
  }

  async resolvePath(filePath) {
    return path.resolve(filePath);
  }
}

module.exports = new FileRepository();
