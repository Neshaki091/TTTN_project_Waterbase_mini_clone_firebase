const Owner = require('../../models/owner.model');

/**
 * OwnerRepository handles all database interactions for the Owner entity.
 * Adheres to SRP and DIP.
 */
class OwnerRepository {
  async findAll() {
    return Owner.find().select('_id profile apps role createdAt status');
  }

  async findById(ownerId) {
    return Owner.findById(ownerId);
  }

  async findByEmail(email) {
    return Owner.findOne({ "profile.email": email });
  }

  async create(ownerData) {
    const owner = new Owner(ownerData);
    return owner.save();
  }

  async update(ownerId, updateData) {
    return Owner.findByIdAndUpdate(ownerId, updateData, { new: true });
  }

  async delete(ownerId) {
    return Owner.findByIdAndDelete(ownerId);
  }

  async countOwners() {
    return Owner.countDocuments({ role: 'owner' });
  }

  async findAllWithApps() {
    return Owner.find().select('apps _id profile role status createdAt');
  }

  async findOwnersOnly() {
      return Owner.find({ role: { $ne: 'adminWaterbase' } });
  }
}

module.exports = new OwnerRepository();
