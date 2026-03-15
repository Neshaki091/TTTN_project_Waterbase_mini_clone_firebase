const ownerService = require('../services/owner.service');

// 🧩 Hàm helper để chỉ trả về dữ liệu an toàn
function sanitizeOwner(owner) {
    if (!owner) return null;
    const { _id, profile, apps, role } = owner;
    console.log("Đăng nhập user", _id, profile, apps, role)
    return { _id, profile, apps, role };
}

// 🧠 Lấy tất cả owner (chỉ admin)
exports.getAllOwners = async (req, res) => {
    try {
        const ownersWithStats = await ownerService.getAllOwners();
        res.status(200).json(ownersWithStats);
    } catch (err) {
        console.error('Error in getAllOwners:', err);
        res.status(500).json({ message: 'Error retrieving owners', error: err.message });
    }
};

// 🔍 Lấy owner theo ID (admin hoặc chính owner - quyền đã check bằng middleware)
exports.getOwnerById = async (req, res) => {
    try {
        const owner = await ownerService.getOwnerById(req.params.id);
        if (!owner) return res.status(404).json({ message: 'Owner not found' });
        res.status(200).json(sanitizeOwner(owner));
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving owner', error: err.message });
    }
};

// 🧱 Tạo owner mới
exports.createOwner = async (req, res) => {
    try {
        const owner = await ownerService.createOwner(req.body);
        res.status(201).json(sanitizeOwner(owner));
    } catch (err) {
        if (err.message === 'Email already registered') {
            return res.status(400).json({ message: err.message });
        }
        res.status(500).json({ message: 'Error creating owner', error: err.message });
    }
};

// 🔐 Tạo admin (dành cho ADMIN_SECRET)
exports.createWaterbaseAdmin = async (req, res) => {
    const { name, email, password, adminSecret } = req.body;
    console.log("crate new admin: ", name, email, password, adminSecret);

    try {
        const admin = await ownerService.createWaterbaseAdmin({ name, email, password }, adminSecret);
        res.status(201).json(sanitizeOwner(admin));
    } catch (err) {
        if (err.message === 'Invalid admin secret key') {
            return res.status(403).json({ message: err.message });
        }
        if (err.message === 'Email already registered') {
            return res.status(400).json({ message: err.message });
        }
        res.status(500).json({ message: 'Error creating admin', error: err.message });
    }
};

// 🧾 Cập nhật owner
exports.updateOwner = async (req, res) => {
    try {
        const updatedOwner = await ownerService.updateOwner(req.params.id, req.body, req.user);
        res.status(200).json(sanitizeOwner(updatedOwner));
    } catch (err) {
        if (err.message === 'Forbidden') return res.status(403).json({ message: 'Forbidden' });
        if (err.message === 'Owner not found') return res.status(404).json({ message: 'Owner not found' });
        res.status(500).json({ message: 'Error updating owner', error: err.message });
    }
};

// 🗑️ Xóa owner
exports.deleteOwner = async (req, res) => {
    try {
        await ownerService.deleteOwner(req.params.id);
        res.status(200).json({ message: 'Owner deleted successfully' });
    } catch (err) {
        if (err.message === 'Owner not found') return res.status(404).json({ message: 'Owner not found' });
        res.status(500).json({ message: 'Error deleting owner', error: err.message });
    }
};

// ⚙️ Thêm/xóa apps của owner
exports.updateOwnerApps = async (req, res) => {
    try {
        const updatedOwner = await ownerService.updateOwnerApps(req.params.id, req.body.action, req.body.app, req.user);
        res.status(200).json(sanitizeOwner(updatedOwner));
    } catch (err) {
        if (err.message === 'Forbidden') return res.status(403).json({ message: 'Forbidden' });
        if (err.message === 'Owner not found') return res.status(404).json({ message: 'Owner not found' });
        if (err.message === 'Invalid action') return res.status(400).json({ message: 'Invalid action' });
        res.status(500).json({ message: 'Error updating apps', error: err.message });
    }
};

// 🔑 Login
exports.loginOwner = async (req, res) => {
    try {
        const { owner, accessToken, refreshToken } = await ownerService.loginOwner(req.body.email, req.body.password);
        res.status(200).json({
            owner: sanitizeOwner(owner),
            accessToken,
            refreshToken
        });
    } catch (err) {
        if (err.message === 'Owner not found') return res.status(404).json({ message: 'Owner not found' });
        if (err.message === 'Invalid password') return res.status(401).json({ message: 'Invalid password' });
        res.status(500).json({ message: 'Error during login', error: err.message });
    }
};

// 🚪 Logout
exports.logoutOwner = async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(400).json({ message: 'Missing Authorization header' });
    }
    const accessToken = authHeader.split(' ')[1];

    try {
        await ownerService.logoutOwner(req.user.id, accessToken);
        res.status(200).json({ message: 'Logout successful' });
    } catch (err) {
        res.status(500).json({ message: 'Error during logout', error: err.message });
    }
};

// 📊 Lấy thống kê toàn hệ thống (Admin)
exports.getSystemStats = async (req, res) => {
    try {
        const stats = await ownerService.getSystemStats();
        res.status(200).json(stats);
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving system stats', error: err.message });
    }
};

// 📊 Lấy thống kê sử dụng của Owner (Database + Storage)
exports.getOwnerUsage = async (req, res) => {
    try {
        const usage = await ownerService.getOwnerUsage(req.params.id, req.user, req.headers.authorization);
        res.status(200).json(usage);
    } catch (err) {
        if (err.message === 'Forbidden') return res.status(403).json({ message: 'Forbidden' });
        if (err.message === 'Owner not found') return res.status(404).json({ message: 'Owner not found' });
        res.status(500).json({ message: 'Error retrieving owner usage', error: err.message });
    }
};

// 🔒 Lock/Unlock owner account (Admin only)
exports.lockOwner = async (req, res) => {
    try {
        const owner = await ownerService.lockOwner(req.params.id, req.body.locked);
        res.status(200).json({
            message: `Owner account ${req.body.locked ? 'locked' : 'unlocked'} successfully`,
            owner: {
                _id: owner._id,
                email: owner.profile?.email,
                status: owner.status
            }
        });
    } catch (error) {
        if (error.message === 'Owner not found') return res.status(404).json({ message: 'Owner not found' });
        if (error.message === 'Cannot lock admin accounts') return res.status(403).json({ message: 'Cannot lock admin accounts' });
        res.status(500).json({ message: 'Error updating owner status', error: error.message });
    }
};

// 📊 Get comprehensive dashboard statistics (Admin only)
exports.getDashboardStats = async (req, res) => {
    try {
        const stats = await ownerService.getDashboardStats();
        res.status(200).json(stats);
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        res.status(500).json({ message: 'Error retrieving dashboard statistics', error: error.message });
    }
};

// 📊 Get all apps with usage stats (Admin only)
exports.getAllAppsWithStats = async (req, res) => {
    try {
        const apps = await ownerService.getAllAppsWithStats();
        res.status(200).json(apps);
    } catch (err) {
        console.error('❌ Error getting all apps with stats via RPC:', err);
        res.status(500).json({ message: 'Error retrieving apps', error: err.message });
    }
};

// 🔑 Forgot Password - Send temporary password via email
exports.forgotPassword = async (req, res) => {
    if (!req.body.email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        const result = await ownerService.forgotPassword(req.body.email);
        res.status(200).json(result);
    } catch (err) {
        console.error('Error in forgotPassword:', err);
        res.status(500).json({
            message: 'Đã xảy ra lỗi khi xử lý yêu cầu. Vui lòng thử lại sau.',
            error: err.message
        });
    }
};

// 🔐 Change Password - Authenticated user changes their password
exports.changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
    }

    try {
        await ownerService.changePassword(req.user.id, currentPassword, newPassword);
        res.status(200).json({ message: 'Password changed successfully' });
    } catch (err) {
        if (err.message === 'New password must be at least 6 characters long') return res.status(400).json({ message: err.message });
        if (err.message === 'Owner not found') return res.status(404).json({ message: err.message });
        if (err.message === 'Current password is incorrect') return res.status(401).json({ message: err.message });
        
        console.error('Error in changePassword:', err);
        res.status(500).json({ message: 'Error changing password', error: err.message });
    }
};

// 👤 Update Profile - Update username and other profile info
exports.updateProfile = async (req, res) => {
    try {
        const owner = await ownerService.updateProfile(req.user.id, req.body.username, req.body.name);
        res.status(200).json({
            message: 'Profile updated successfully',
            owner: sanitizeOwner(owner)
        });
    } catch (err) {
        if (err.message === 'At least one field (username or name) is required') return res.status(400).json({ message: err.message });
        if (err.message === 'Owner not found') return res.status(404).json({ message: err.message });

        console.error('Error in updateProfile:', err);
        res.status(500).json({ message: 'Error updating profile', error: err.message });
    }
};
