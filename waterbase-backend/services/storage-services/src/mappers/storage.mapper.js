/**
 * StorageMapper handles the transformation of File information to DTOs.
 * Adheres to SRP.
 */
class StorageMapper {
  toDTO(appId, fileName, stats, originalName = '') {
    return {
      id: fileName,
      name: originalName || fileName,
      mimeType: this._getMimeType(fileName),
      size: stats.size,
      url: `/api/v1/storage/${appId}/${fileName}`,
      createdAt: stats.birthtime || stats.createdAt || new Date()
    };
  }

  toDTOList(appId, files) {
    if (!Array.isArray(files)) return [];
    return files.map(file => this.toDTO(appId, file.name, file.stats));
  }

  _getMimeType(fileName) {
    // Simple extension to mime mapping if needed, or just return from original if stored
    return 'application/octet-stream'; // Placeholder
  }
}

module.exports = new StorageMapper();
