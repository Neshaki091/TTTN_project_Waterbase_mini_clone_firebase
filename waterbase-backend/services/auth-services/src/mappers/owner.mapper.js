/**
 * OwnerMapper handles the transformation of Owner entities to DTOs.
 * Adheres to SRP.
 */
class OwnerMapper {
  /**
   * Transforms a raw database owner object into a sanitized DTO.
   */
  toDTO(owner) {
    if (!owner) return null;
    
    const raw = owner.toObject ? owner.toObject() : owner;
    
    return {
      _id: raw._id,
      profile: raw.profile,
      apps: raw.apps || [],
      role: raw.role,
      status: raw.status,
      createdAt: raw.createdAt
    };
  }

  /**
   * Transforms a list of owners.
   */
  toDTOList(owners) {
    if (!Array.isArray(owners)) return [];
    return owners.map(owner => this.toDTO(owner));
  }
}

module.exports = new OwnerMapper();
