/**
 * WaterDBMapper handles data transformation for WaterDB entities.
 * Adheres to SRP.
 */
class WaterDBMapper {
  toDTO(doc) {
    if (!doc) return null;
    return {
      id: doc.documentId,
      data: doc.data,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  toDTOList(docs) {
    if (!Array.isArray(docs)) return [];
    return docs.map((doc) => this.toDTO(doc));
  }
}

module.exports = new WaterDBMapper();
