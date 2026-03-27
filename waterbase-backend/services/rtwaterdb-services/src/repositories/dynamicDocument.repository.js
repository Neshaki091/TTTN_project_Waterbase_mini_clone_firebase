const DynamicDocument = require('../models/dynamicDocument.model');

/**
 * DynamicDocumentRepository handles all database interactions for RTWaterDB.
 * Adheres to SRP and DIP.
 */
class DynamicDocumentRepository {
  async findDistinctCollections(appId) {
    return DynamicDocument.distinct('collection', { appId });
  }

  async findDocuments(filter, sort, limit) {
    return DynamicDocument.find(filter)
      .sort(sort)
      .limit(limit);
  }

  async findOne(filter) {
    return DynamicDocument.findOne(filter);
  }

  async findByIdOrDocumentId(appId, collection, id) {
    let doc = await DynamicDocument.findOne({ appId, collection, documentId: id });
    if (!doc) {
      doc = await DynamicDocument.findOne({ appId, collection, _id: id });
    }
    return doc;
  }

  async create(docData) {
    return DynamicDocument.create(docData);
  }

  async findOneAndUpdate(filter, updateData) {
    // Try by documentId first usually done in service, but we can provide generic update
    return DynamicDocument.findOneAndUpdate(filter, updateData, { new: true });
  }

  async findOneAndDelete(filter) {
    return DynamicDocument.findOneAndDelete(filter);
  }

  async countDocuments(filter) {
    return DynamicDocument.countDocuments(filter);
  }

  async findAllLean(filter) {
    return DynamicDocument.find(filter).lean();
  }
}

module.exports = new DynamicDocumentRepository();
