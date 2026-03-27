/**
 * RuleMapper handles the transformation of Rule entities to DTOs.
 * Adheres to SRP.
 */
class RuleMapper {
  toDTO(rule) {
    if (!rule) return null;
    const raw = rule.toObject ? rule.toObject() : rule;
    return {
      _id: raw._id,
      appId: raw.appId,
      role: raw.role,
      actions: raw.actions,
      ownerId: raw.ownerId,
      updatedBy: raw.updatedBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt
    };
  }

  toDTOList(rules) {
    if (!Array.isArray(rules)) return [];
    return rules.map(rule => this.toDTO(rule));
  }
}

module.exports = new RuleMapper();
