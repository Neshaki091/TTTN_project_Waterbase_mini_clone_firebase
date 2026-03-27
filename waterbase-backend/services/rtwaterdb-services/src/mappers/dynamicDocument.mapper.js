/**
 * DynamicDocumentMapper handles data transformation for RTWaterDB.
 * Adheres to SRP.
 */
class DynamicDocumentMapper {
  toDTO(doc) {
    if (!doc) return null;
    const raw = doc.toObject ? doc.toObject() : doc;
    return {
      _id: raw._id,
      documentId: raw.documentId,
      collection: raw.collection,
      data: raw.data,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      createdBy: raw.createdBy,
      updatedBy: raw.updatedBy
    };
  }

  toDTOList(docs) {
    if (!Array.isArray(docs)) return [];
    return docs.map(doc => this.toDTO(doc));
  }
}

module.exports = new DynamicDocumentMapper();
