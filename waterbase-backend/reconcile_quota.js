const mongoose = require('mongoose');
const DynamicDocument = require('./services/waterdb-services/src/models/dynamicDocument.model');
const App = require('./services/app-services/models/app.model');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const STORAGE_PATH = process.env.STORAGE_PATH || './services/storage-services/storage';

async function getDirectorySize(dirPath) {
    try {
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        let totalSize = 0;
        let fileCount = 0;
        for (const file of files) {
            const filePath = path.join(dirPath, file.name);
            if (file.isDirectory()) {
                const subDirStats = await getDirectorySize(filePath);
                totalSize += subDirStats.size;
                fileCount += subDirStats.count;
            } else {
                const stats = await fs.stat(filePath);
                totalSize += stats.size;
                fileCount++;
            }
        }
        return { size: totalSize, count: fileCount };
    } catch (err) {
        return { size: 0, count: 0 };
    }
}

async function reconcile() {
    try {
        console.log('🚀 Starting Quota Reconciliation...');

        // 1. Connect to MongoDB (assuming shared or accessible URIs)
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/waterbase');
        console.log('✅ MongoDB connected');

        const apps = await App.find({ status: { $ne: 'deleted' } });
        console.log(`📊 Found ${apps.length} apps to sync.`);

        for (const app of apps) {
            const { appId } = app;
            console.log(`\n--- Syncing App: ${appId} ---`);

            // Sync WaterDB
            const waterdbDocs = await DynamicDocument.find({ appId });
            let waterdbSize = 0;
            for (const doc of waterdbDocs) {
                // Calculate and update local metadata if missing
                const size = Buffer.byteLength(JSON.stringify(doc.data)) + 100;
                if (!doc.UsageService || doc.UsageService.storageSize === 0) {
                   await DynamicDocument.updateOne({ _id: doc._id }, { 
                       'UsageService.storageSize': size,
                       'UsageService.docCount': 1
                   });
                }
                waterdbSize += size;
            }
            const waterdbCount = waterdbDocs.length;
            console.log(`DB: ${waterdbCount} docs, ${waterdbSize} bytes`);

            // Sync Storage
            const appDir = path.join(STORAGE_PATH, appId);
            const { size: storageSize, count: storageCount } = await getDirectorySize(appDir);
            console.log(`Storage: ${storageCount} files, ${storageSize} bytes`);

            // Update App Model
            await App.updateOne({ appId }, {
                'QuotaManager.waterdb.storageSize': waterdbSize,
                'QuotaManager.waterdb.docCount': waterdbCount,
                'QuotaManager.storage.storageSize': storageSize,
                'QuotaManager.storage.docCount': storageCount,
                updatedAt: new Date()
            });

            console.log(`✅ App ${appId} synced successfully.`);
        }

        console.log('\n✨ Reconciliation finished successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Reconciliation failed:', error);
        process.exit(1);
    }
}

reconcile();
