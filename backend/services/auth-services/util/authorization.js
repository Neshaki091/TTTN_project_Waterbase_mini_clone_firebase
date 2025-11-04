// util/authorization.js
const roleLevel = { admin: 1, owner: 2, user: 3, guest: 4 }; // Thêm guest cho đầy đủ
const UserSchema = require('../models/user.model');

// Kiểm tra role theo hierarchy
function checkRole(requiredLevel) {
    return (req, res, next) => {
        if (!req.user || !req.user.role) return res.status(401).json({ message: 'Unauthorized' });

        // Dùng role từ req.user (được gán trong middleware)
        if (roleLevel[req.user.role] > requiredLevel) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        next();
    };
}

// Kiểm tra owner chỉ quản lý user trong app của mình
async function checkAppAccess(req, res, next) {
    // Nếu là admin, cho qua
    if (req.user.role === 'admin') return next();
    
    // Nếu là owner, phải kiểm tra danh sách apps trong token (req.user.apps)
    if (req.user.role === 'owner') {
        const userId = req.params.id;
        if (!userId) {
            // Trường hợp endpoint không có userId (vd: tạo user)
            const appId = req.headers['x-app-id']; 
            if (!appId) return res.status(400).json({ message: 'x-app-id header required' });
            
            // Kiểm tra xem owner có app này không
            if (!req.user.apps.map(a => a.appId).includes(appId)) {
                return res.status(403).json({ message: 'Forbidden: App not managed by this owner.' });
            }
            return next();
        }

        // Trường hợp endpoint có userId (get/update/delete)
        const user = await UserSchema.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        // Kiểm tra appId của user có nằm trong danh sách apps của owner không
        if (!req.user.apps.map(a => a.appId).includes(user.appId)) {
            return res.status(403).json({ message: 'Forbidden: User not in a managed app.' });
        }
    }
    
    next();
}

module.exports = { checkRole, checkAppAccess };