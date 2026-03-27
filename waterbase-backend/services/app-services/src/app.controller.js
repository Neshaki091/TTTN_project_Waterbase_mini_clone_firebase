const appService = require('./services/app.service');
const appMapper = require('./mappers/app.mapper');

exports.getAllApps = async (req, res) => {
    try {
        const apps = await appService.getAllApps(req.user);
        
        if (req.user.role === 'adminWaterbase') {
            const ownerIds = [...new Set(apps.map(app => app.ownerId))];
            const ownerMap = await appService.getOwnerInfo(ownerIds, req.headers.authorization);
            return res.status(200).json(appMapper.toDTOList(apps, ownerMap));
        }

        res.status(200).json(appMapper.toDTOList(apps));
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving apps', error: error.message });
    }
};

exports.getAppById = async (req, res) => {
    try {
        const app = await appService.getAppById(req.params.id, req.user);
        res.status(200).json(appMapper.toDTO(app));
    } catch (error) {
        const status = error.message === 'App not found' ? 404 : (error.message === 'Access denied' ? 403 : 500);
        res.status(status).json({ message: error.message });
    }
};

exports.createApp = async (req, res) => {
    try {
        const app = await appService.createApp(req.body, req.user, req.headers.authorization);
        res.status(201).json({
            message: 'App created successfully',
            app: appMapper.toPublicDTO(app)
        });
    } catch (error) {
        const status = error.message.includes('limit reached') ? 403 : (error.message.includes('already exists') ? 400 : 500);
        res.status(status).json({ message: error.message });
    }
};

exports.updateApp = async (req, res) => {
    try {
        const app = await appService.updateApp(req.params.id, req.body, req.user);
        res.status(200).json({ message: 'App updated successfully', app: appMapper.toDTO(app) });
    } catch (error) {
        const status = error.message === 'App not found' ? 404 : (error.message === 'Access denied' ? 403 : 500);
        res.status(status).json({ message: error.message });
    }
};

exports.deleteApp = async (req, res) => {
    try {
        await appService.deleteApp(req.params.id, req.user, req.headers.authorization);
        res.status(200).json({ message: 'App deleted successfully' });
    } catch (error) {
        const status = error.message === 'App not found' ? 404 : (error.message === 'Access denied' ? 403 : 500);
        res.status(status).json({ message: error.message });
    }
};

exports.getDeletedApps = async (req, res) => {
    try {
        if (req.user.role !== 'adminWaterbase') return res.status(403).json({ message: 'Access denied. Admin only.' });
        
        const deletedApps = await appService.getDeletedApps();
        const ownerIds = [...new Set(deletedApps.map(app => app.ownerId))];
        const ownerMap = await appService.getOwnerInfo(ownerIds, req.headers.authorization);
        
        res.status(200).json(appMapper.toDTOList(deletedApps, ownerMap));
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving deleted apps', error: error.message });
    }
};

exports.permanentlyDeleteApp = async (req, res) => {
    try {
        if (req.user.role !== 'adminWaterbase') return res.status(403).json({ message: 'Access denied. Admin only.' });
        
        await appService.permanentlyDeleteApp(req.params.id);
        res.status(200).json({ message: 'App permanently deleted' });
    } catch (error) {
        const status = error.message === 'App not found' ? 404 : 400;
        res.status(status).json({ message: error.message });
    }
};

exports.getAppAPIKey = async (req, res) => {
    try {
        const app = await appService.getAppById(req.params.id, req.user);
        res.status(200).json({ appId: app.appId, apiKey: app.apiKey });
    } catch (error) {
        const status = error.message === 'App not found' ? 404 : (error.message === 'Access denied' ? 403 : 500);
        res.status(status).json({ message: error.message });
    }
};

exports.regenerateAPIKey = async (req, res) => {
    try {
        const app = await appService.regenerateApiKey(req.params.id, req.user);
        res.status(200).json({ message: 'API key regenerated successfully', apiKey: app.apiKey });
    } catch (error) {
        const status = error.message === 'App not found' ? 404 : (error.message === 'Access denied' ? 403 : 500);
        res.status(status).json({ message: error.message });
    }
};

exports.downloadServiceJson = async (req, res) => {
    try {
        const app = await appService.getAppById(req.params.id, req.user);
        const serviceJson = appMapper.toServiceJson(app, process.env.API_URL);
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="waterbase-service.json"`);
        res.status(200).json(serviceJson);
    } catch (error) {
        const status = error.message === 'App not found' ? 404 : (error.message === 'Access denied' ? 403 : 500);
        res.status(status).json({ message: error.message });
    }
};

exports.regenerateServiceJson = async (req, res) => {
    try {
        const app = await appService.regenerateApiKey(req.params.id, req.user);
        const serviceJson = appMapper.toServiceJson(app, process.env.API_URL);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="waterbase-service.json"`);
        res.status(200).json({
            message: 'Service.json regenerated with new API key.',
            serviceJson
        });
    } catch (error) {
        const status = error.message === 'App not found' ? 404 : (error.message === 'Access denied' ? 403 : 500);
        res.status(status).json({ message: error.message });
    }
};

exports.getAllAppsWithStatsRPC = async () => {
    return appService.getAllAppsWithStatsRPC();
};