const App = require('../../models/app.model');

/**
 * AppRepository handles all database interactions for the App entity.
 * Adheres to SRP and DIP.
 */
class AppRepository {
  async find(filter) {
    return App.find(filter);
  }

  async findOne(filter) {
    return App.findOne(filter);
  }

  async findByAppId(appId) {
    return App.findOne({ appId, status: { $ne: 'deleted' } });
  }

  async countDocuments(filter) {
    return App.countDocuments(filter);
  }

  async create(appData) {
    const app = new App(appData);
    return app.save();
  }

  async update(appId, updateData) {
    return App.findOneAndUpdate({ appId }, updateData, { new: true });
  }

  async deleteSoft(appId) {
    return App.findOneAndUpdate(
      { appId }, 
      { status: 'deleted', updatedAt: new Date() }, 
      { new: true }
    );
  }

  async deletePermanent(appId) {
    return App.deleteOne({ appId });
  }
}

module.exports = new AppRepository();
