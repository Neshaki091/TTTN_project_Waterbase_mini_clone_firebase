const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
require('dotenv').config();

const App = require('../models/app.model');

async function migrateApps() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/app_service');
        console.log('Connected to MongoDB');

        // Find all apps without appId
        const apps = await App.find({ appId: { $exists: false } });
        console.log(`Found ${apps.length} apps to migrate`);

        for (const app of apps) {
            // Generate unique appId
            app.appId = nanoid(12);

            // Fix APIkey -> apiKey if needed
            if (app.APIkey && !app.apiKey) {
                app.apiKey = app.APIkey;
            }

            // Set default status
            if (!app.status) {
                app.status = 'active';
            }

            // Set default config
            if (!app.config) {
                app.config = {};
            }

            await app.save();
            console.log(`✅ Migrated app ${app._id} -> appId: ${app.appId}`);
        }

        console.log('Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateApps();
