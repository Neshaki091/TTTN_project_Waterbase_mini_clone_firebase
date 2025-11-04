const appSchema = require('../schemas/app.schema');
const uuidv7  = require('uuid').v7;

const axios = require('axios');
exports.getAllApps = async (req, res) => {
    try {
        const apps = await appSchema.find();
        res.status(200).json(apps);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving apps', error });
    }
};

exports.getAppById = async (req, res) => {
    const appId = req.params.id;
    try {
        const app = await appSchema.findById(appId);
        if (!app) {
            return res.status(404).json({ message: 'App not found' });
        }   
        res.status(200).json(app);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving app', error });
    }
};

exports.createApp = async (req, res) => {
    const { name, description, version, ownerId } = req.body;
    const apiKey = gennerateAPIKey();
    try {
        const isExistingApp = await appSchema.findOne({ name, ownerId });
        if (isExistingApp) {
            return res.status(400).json({ message: 'App with the same name already exists for this owner' });
        }
        const newApp = new appSchema({ name, description, version, ownerId });
        newApp.APIkey = apiKey;
        await newApp.save();
        res.status(201).json(newApp);
    } catch (error) {
        res.status(500).json({ message: 'Error creating app', error });
    }
};

exports.updateApp = async (req, res) => {
    const appId = req.params.id;
    const { name, description, version } = req.body;
    const apiKey = gennerateAPIKey();
    try {
        const updatedApp = await appSchema.findByIdAndUpdate(
            appId,
            { name, description, version, updatedAt: Date.now(), APIkey: apiKey },
            { new: true }
        );
        if (!updatedApp) {
            return res.status(404).json({ message: 'App not found' });
        }
        res.status(200).json(updatedApp);
    } catch (error) {
        res.status(500).json({ message: 'Error updating app', error });
    }
};
exports.deleteApp = async (req, res) => {
    const appId = req.params.id;
    try {
        const deletedApp = await appSchema.findByIdAndDelete(appId);
        if (!deletedApp) {
            return res.status(404).json({ message: 'App not found' });
        }
        res.status(200).json({ message: 'App deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting app', error });
    }   
};

exports.getAppAPIKey = async (req, res) => {

    const appId = req.params.id;
    try {
        const app = await appSchema.findById(appId);
        if (!app) {
            return res.status(404).json({ message: 'App not found' });
        }
        res.status(200).json({ APIkey: app.APIkey });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving API key', error });
    }
};

const verifyAuthentication = (req) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return false;
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return false;
    }
    
    return true;
}
const gennerateAPIKey = () => {
    return 'api_' + uuidv7(); 
}