const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./util/connectdb');
dotenv.config();
const verifyRoutes = require('./routes/verify.routes'); // <-- THÊM: Import route xác thực token
const ownerRoutes = require('./routes/owner.routes'); // <-- THÊM: Import route quản lý owner   
const userRoutes = require('./routes/user.routes'); // <-- THÊM: Import route quản lý user

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.use(express.json());
connectDB();
app.use('/verify', verifyRoutes); // <-- THÊM: Sử dụng route xác thực token
app.use('/owners', ownerRoutes);
app.use('/users', userRoutes);

app.listen(PORT, () => {
    console.log(`Auth service is running on port ${PORT}`);
});