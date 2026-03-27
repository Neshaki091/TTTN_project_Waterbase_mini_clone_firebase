const userService = require('../services/user.service');
const userMapper = require('../mappers/user.mapper');

// 🧠 Lấy tất cả user trong app
exports.getAllUsersInApp = async (req, res) => {
    const appId = req.headers['x-app-id'];
    if (!appId) return res.status(400).json({ message: 'x-app-id header required' });

    try {
        const users = await userService.getAllUsersInApp(appId);
        res.status(200).json(userMapper.toDTOList(users));
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving users', error: err.message });
    }
};

// 🔍 Lấy user theo ID
exports.getUserById = async (req, res) => {
    try {
        const user = await userService.getUserById(req.params.id, req.user);
        res.status(200).json(userMapper.toDTO(user));
    } catch (err) {
        if (err.message === 'User not found') return res.status(404).json({ message: 'User not found' });
        if (err.message === 'Forbidden') return res.status(403).json({ message: 'Forbidden' });
        res.status(500).json({ message: 'Error retrieving user', error: err.message });
    }
};

// 🧱 Tạo user
exports.createUser = async (req, res) => {
    const { email, password } = req.body;
    const appId = req.headers['x-app-id'];
    if (!appId) return res.status(400).json({ message: 'x-app-id header required' });
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    try {
        const { user, accessToken, refreshToken } = await userService.createUser(appId, req.body);

        res.status(201).json({
            message: 'User created successfully',
            user: userMapper.toDTO(user),
            accessToken,
            refreshToken
        });
    } catch (err) {
        if (err.message === 'User already exists in this app') return res.status(400).json({ message: err.message });
        res.status(500).json({ message: 'Error creating user', error: err.message });
    }
};

// 📝 Cập nhật user
exports.updateUser = async (req, res) => {
    try {
        const user = await userService.updateUser(req.params.id, req.body, req.user);
        res.status(200).json(userMapper.toDTO(user));
    } catch (err) {
        if (err.message === 'User not found') return res.status(404).json({ message: 'User not found' });
        if (err.message === 'Cannot update user in this app') return res.status(403).json({ message: err.message });
        res.status(500).json({ message: 'Error updating user', error: err.message });
    }
};

// 🗑️ Xóa user
exports.deleteUser = async (req, res) => {
    try {
        await userService.deleteUser(req.params.id);
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (err) {
        if (err.message === 'User not found') return res.status(404).json({ message: 'User not found' });
        res.status(500).json({ message: 'Error deleting user', error: err.message });
    }
};

// 🔑 Login user
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    const appId = req.headers['x-app-id'];
    if (!appId) return res.status(400).json({ message: 'x-app-id header required' });

    try {
        const { user, accessToken, refreshToken } = await userService.loginUser(appId, email, password);

        res.status(200).json({
            message: 'Login successful',
            user: userMapper.toDTO(user),
            accessToken,
            refreshToken
        });
    } catch (err) {
        if (err.message === 'Invalid credentials') return res.status(401).json({ message: err.message });
        if (err.message === 'Account is locked') return res.status(403).json({ message: err.message });
        res.status(500).json({ message: 'Error during login', error: err.message });
    }
};

// 🚪 Logout user
exports.logoutUser = async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(400).json({ message: 'Missing Authorization header' });
    }
    const accessToken = authHeader.split(' ')[1];

    try {
        await userService.logoutUser(req.user.id, accessToken);
        res.status(200).json({ message: 'Logout successful' });
    } catch (err) {
        res.status(500).json({ message: 'Error during logout', error: err.message });
    }
};

// 🔄 Change password
exports.changePassword = async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    try {
        await userService.changePassword(req.params.id, oldPassword, newPassword);
        res.status(200).json({ message: 'Password changed successfully' });
    } catch (err) {
        if (err.message === 'User not found') return res.status(404).json({ message: 'User not found' });
        if (err.message === 'Invalid old password') return res.status(401).json({ message: 'Invalid old password' });
        res.status(500).json({ message: 'Error changing password', error: err.message });
    }
};

// 🔒 Khóa/Mở khóa user
exports.toggleUserStatus = async (req, res) => {
    try {
        const user = await userService.toggleUserStatus(req.params.id, req.body.isActive, req.user);
        res.status(200).json({
            message: `User ${req.body.isActive ? 'activated' : 'deactivated'} successfully`,
            user: userMapper.toDTO(user)
        });
    } catch (err) {
        if (err.message === 'User not found') return res.status(404).json({ message: 'User not found' });
        if (err.message === 'Forbidden') return res.status(403).json({ message: 'Forbidden' });
        res.status(500).json({ message: 'Error updating user status', error: err.message });
    }
};

// 166: // 📊 Lấy thống kê user trong app
exports.getAppStats = async (req, res) => {
    const appId = req.headers['x-app-id'];
    if (!appId) return res.status(400).json({ message: 'x-app-id header required' });

    try {
        const stats = await userService.getAppStats(appId);
        res.status(200).json(stats);
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving user stats', error: err.message });
    }
};
