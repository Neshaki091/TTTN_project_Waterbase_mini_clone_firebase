/**
 * AppMapper handles data transformation for the App entity.
 * Adheres to SRP.
 */
class AppMapper {
  toDTO(app, extraInfo = {}) {
    if (!app) return null;
    const raw = app.toObject ? app.toObject() : app;
    return {
      appId: raw.appId,
      name: raw.name,
      description: raw.description,
      ownerId: raw.ownerId,
      apiKey: raw.apiKey,
      config: raw.config,
      status: raw.status,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      QuotaManager: raw.QuotaManager,
      ...extraInfo
    };
  }

  toDTOList(apps, ownerMap = {}) {
    if (!Array.isArray(apps)) return [];
    return apps.map(app => {
      const extra = ownerMap[app.ownerId] || {};
      return this.toDTO(app, extra);
    });
  }

  toPublicDTO(app) {
    if (!app) return null;
    return {
      appId: app.appId,
      name: app.name,
      description: app.description,
      createdAt: app.createdAt
    };
  }

  toServiceJson(app, apiUrl) {
    if (!app) return null;
    return {
      apiUrl: apiUrl || 'https://api.waterbase.click',
      appId: app.appId,
      apiKey: app.apiKey,
      projectName: app.name,
      projectDescription: app.description || ''
    };
  }
}

module.exports = new AppMapper();
