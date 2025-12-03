const appSchema = require('../models/app.model');
exports.checkApiKey = (req, res, next) => {  
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return res.status(401).json({ message: 'API key is missing' });
    }   
    appSchema.findOne({ APIkey: apiKey })
        .then(app => {
            if (!app) {
                return res.status(403).json({ message: 'Invalid API key' });
            }   
            next();
        })
        .catch(err => {
            res.status(500).json({ message: 'Error verifying API key', err });
        });
};