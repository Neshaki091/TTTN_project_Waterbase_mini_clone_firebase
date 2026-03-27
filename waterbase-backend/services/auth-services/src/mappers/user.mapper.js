/**
 * UserMapper handles the transformation of User entities to DTOs.
 * Adheres to SRP by centralizing data sanitization logic.
 */
class UserMapper {
  /**
   * Transforms a raw database user object into a clean, safe-to-return object.
   * @param {Object} user - The raw Mongoose user document.
   * @returns {Object} Sanitized user data.
   */
  toDTO(user) {
    if (!user) return null;
    
    // Support both plain objects and Mongoose documents
    const raw = user.toObject ? user.toObject() : user;
    
    return {
      _id: raw._id,
      email: raw.profile?.email,
      username: raw.profile?.username,
      appId: raw.appId,
      role: raw.role,
      isActive: raw.isActive,
      createdAt: raw.profile?.createdAt || raw.createdAt,
      updatedAt: raw.updatedAt
    };
  }

  /**
   * Transforms a list of users.
   */
  toDTOList(users) {
    if (!Array.isArray(users)) return [];
    return users.map(user => this.toDTO(user));
  }
}

module.exports = new UserMapper();
