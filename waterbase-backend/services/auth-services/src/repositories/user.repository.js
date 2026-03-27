const User = require('../../models/user.model');

/**
 * UserRepository handles all database interactions for the User entity.
 * Adheres to SRP and DIP by isolating Mongoose-specific logic.
 */
class UserRepository {
  async findAllByAppId(appId) {
    return User.find({ appId }).select('profile appId isActive role');
  }

  async findById(userId) {
    return User.findById(userId);
  }

  async findByEmailAndAppId(email, appId) {
    return User.findOne({ "profile.email": email, appId });
  }

  async create(userData) {
    const user = new User(userData);
    return user.save();
  }

  async update(userId, updateData) {
    return User.findByIdAndUpdate(userId, updateData, { new: true });
  }

  async delete(userId) {
    return User.findByIdAndDelete(userId);
  }

  async countByAppId(appId) {
    return User.countDocuments({ appId });
  }
}

module.exports = new UserRepository();
