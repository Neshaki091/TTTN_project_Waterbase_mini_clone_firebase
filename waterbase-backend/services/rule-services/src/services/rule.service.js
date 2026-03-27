const ruleRepository = require('../repositories/rule.repository');

/**
 * RuleEngine evaluates if an action is allowed for a given set of rules.
 * Adheres to OCP (easy to add new matching strategies).
 */
class RuleEngine {
  /**
   * Evaluates if the action is allowed based on the user's role and defined actions.
   */
  isActionAllowed(role, allowedActions, action) {
    if (role === 'owner') return true;
    if (!allowedActions || !Array.isArray(allowedActions)) return false;

    // 1. Exact match or full wildcard
    if (allowedActions.includes(action) || allowedActions.includes('*')) {
      return true;
    }

    // 2. Pattern matching (e.g., read_* matches read_todos)
    return allowedActions.some(pattern => {
      if (pattern.endsWith('_*')) {
        const prefix = pattern.slice(0, -1);
        return action.startsWith(prefix);
      }
      return false;
    });
  }
}

/**
 * RuleService handles the business logic for rule management and evaluation.
 * Adheres to SRP.
 */
class RuleService {
  constructor() {
    this.engine = new RuleEngine();
  }

  async getAllRules(user) {
    if (user.role === 'owner') {
      return ruleRepository.findByOwner(user.id);
    }
    return ruleRepository.findAll();
  }

  async getRule(appId, role, user) {
    const rule = await ruleRepository.findOne(appId, role);
    if (!rule) throw new Error('Rule not found');

    if (user.role === 'owner' && rule.ownerId !== user.id) {
      throw new Error('Forbidden: Cannot view rule of another owner');
    }

    return rule;
  }

  async createRule(ruleData, user) {
    const { appId, role, actions, ownerId: providedOwnerId } = ruleData;
    
    let ownerId;
    if (user.role === 'owner') {
      ownerId = user.id;
    } else if (user.role === 'adminWaterbase') {
      ownerId = providedOwnerId || 'SYSTEM_ADMIN';
    } else {
      throw new Error('Forbidden: Invalid role for creation');
    }

    const existing = await ruleRepository.findOne(appId, role);
    if (existing) throw new Error('Rule already exists for this app and role');

    return ruleRepository.create({
      appId,
      role,
      actions,
      ownerId,
      updatedBy: user.id
    });
  }

  async updateRule(appId, role, actions, user) {
    const rule = await ruleRepository.findOne(appId, role);
    if (!rule) throw new Error('Rule not found');

    if (user.role === 'owner' && rule.ownerId !== user.id) {
      throw new Error('Forbidden: Cannot update rule of another owner');
    }

    return ruleRepository.update(appId, role, actions, user.id);
  }

  async deleteRule(appId, role, user) {
    const rule = await ruleRepository.findOne(appId, role);
    if (!rule) throw new Error('Rule not found');

    if (user.role === 'owner' && rule.ownerId !== user.id) {
      throw new Error('Forbidden: Cannot delete rule of another owner');
    }

    return ruleRepository.delete(appId, role);
  }

  async checkAction(appId, role, action) {
    if (role === 'owner') return true;

    const rule = await ruleRepository.findOne(appId, role);
    if (!rule) {
      throw new Error(`No rule found for role '${role}' in app '${appId}'`);
    }

    const allowed = this.engine.isActionAllowed(role, rule.actions, action);
    if (!allowed) {
      throw new Error(`Action '${action}' forbidden for role '${role}'`);
    }

    return true;
  }
}

module.exports = new RuleService();
