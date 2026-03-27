const Rule = require('../../models/rule.model');

/**
 * RuleRepository handles all database interactions for the Rule entity.
 * Adheres to SRP and DIP.
 */
class RuleRepository {
  async findAll() {
    return Rule.find();
  }

  async findByOwner(ownerId) {
    return Rule.find({ ownerId });
  }

  async findOne(appId, role) {
    return Rule.findOne({ appId, role });
  }

  async create(ruleData) {
    const rule = new Rule(ruleData);
    return rule.save();
  }

  async update(appId, role, actions, updatedBy) {
    return Rule.findOneAndUpdate(
      { appId, role },
      { actions, updatedBy },
      { new: true }
    );
  }

  async delete(appId, role) {
    return Rule.findOneAndDelete({ appId, role });
  }
}

module.exports = new RuleRepository();
