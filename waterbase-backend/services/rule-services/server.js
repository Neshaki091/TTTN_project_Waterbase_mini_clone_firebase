const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const ruleRoutes = require('./routes/rule.routes');

dotenv.config();
const app = express();

app.use(express.json());
app.use((req, res, next) => {
    console.log(`📡 [RULE ENGINE] Request: ${req.method} ${req.url}`);
    next();
});
// Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error', err));

// Internal routes (no auth)
app.use('/internal', require('./routes/internal.routes'));

// Public routes (with auth)
app.use('/', ruleRoutes);

const PORT = process.env.PORT || 3004;
app.listen(PORT, '0.0.0.0', () => console.log(`Rule Engine Service running on port ${PORT}`));
