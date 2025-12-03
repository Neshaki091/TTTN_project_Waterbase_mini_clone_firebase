// util/middleware.js
const jwt = require('jsonwebtoken');
const Owner = require('../models/owner.model'); // Chỉ cần Owner/User model nếu cần DB lookup
const User = require('../models/user.model');

// Middleware chung để xác thực User
exports.usermiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Missing or invalid token' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Sửa: Chỉ cần xác thực token là của User
        // Vì token User không có role/apps phức tạp, ta có thể truy vấn để lấy user object
        const user = await User.findById(decoded.id).select('_id profile role appId'); 
        if (!user) return res.status(401).json({ message: 'Unauthorized' });

        // Gán user object đầy đủ (trừ password/tokens) vào req.user
        req.user = user.toObject(); 
        next();
    } catch (err) {
        res.status(401).json({ message: 'Unauthorized', error: err.message });
    }
};

// Middleware chung để xác thực Owner/Admin
exports.ownermiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Missing or invalid token' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Kiểm tra Access Token có các thông tin cần thiết không.
        if (!decoded.role) {
             // Nếu Access Token không có role, truy vấn DB để lấy owner object đầy đủ
             const owner = await Owner.findById(decoded.id).select('_id profile role apps');
             if (!owner) return res.status(401).json({ message: 'Unauthorized' });
             req.user = owner.toObject();
        } else {
             // Giả định token đã chứa role và apps (từ bước login)
             // Tối ưu: tránh lookup DB
             req.user = decoded;
        }

        next();
    } catch (err) {
        res.status(401).json({ message: 'Unauthorized', error: err.message });
    }
};