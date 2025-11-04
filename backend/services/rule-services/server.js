const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const ruleRoutes = require('./routes/rule.routes');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error', err));

app.use('/rules', ruleRoutes);

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`Rule Engine Service running on port ${PORT}`));
