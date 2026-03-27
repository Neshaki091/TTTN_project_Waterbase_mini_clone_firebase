const DynamicDocument = require('../models/dynamicDocument.model');

/**
 * WaterDBRepository handles all database interactions for non-realtime WaterDB operations.
 * Adheres to SRP and DIP.
 */
class WaterDBRepository {
  async findDistinctCollections(filter) {
    return DynamicDocument.distinct('collection', filter);
  }

  async findDocuments(filter, sort = {}, limit = 50) {
    return DynamicDocument.find(filter)
      .sort(sort)
      .limit(limit);
  }

  async findOne(filter) {
    return DynamicDocument.findOne(filter);
  }

  async create(docData) {
    return DynamicDocument.create(docData);
  }

  async update(filter, updateData) {
    return DynamicDocument.findOneAndUpdate(filter, updateData, { new: true });
  }

  async deleteOne(filter) {
    return DynamicDocument.findOneAndDelete(filter);
  }

  async countDocuments(filter) {
    return DynamicDocument.countDocuments(filter);
  }

  async aggregate(pipeline) {
    return DynamicDocument.aggregate(pipeline);
  }
}

module.exports = new WaterDBRepository();
