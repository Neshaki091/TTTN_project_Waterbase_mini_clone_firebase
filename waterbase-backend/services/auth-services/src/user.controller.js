const UserSchema = require('../models/user.model');
const bcrypt = require('bcrypt');
const {
    generateAccessToken,
    generateRefreshToken,
    addUserRefreshToken,
    deleteUserRefreshToken
} = require('../util/refreshToken');

// 🧩 Hàm helper lọc dữ liệu an toàn
function sanitizeUser(user) {
    if (!user) return null;
    const { _id, profile, appId } = user;
    return {
        _id,
        email: profile.email,
        username: profile.username,
        appId
    };
}

// 🧠 Lấy tất cả user trong app
exports.getAllUsersInApp = async (req, res) => {
    const appId = req.headers['x-app-id'];
    if (!appId) return res.status(400).json({ message: 'x-app-id header required' });

    try {
        const users = await UserSchema.find({ appId }).select('profile appId');
        res.status(200).json(users.map(u => sanitizeUser(u)));
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving users', error: err });
    }
};

// 🔍 Lấy user theo ID
exports.getUserById = async (req, res) => {
    const userId = req.params.id;

    try {
        const user = await UserSchema.findById(userId).select('profile appId');
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Owner chỉ được user cùng app
        if (req.user.role === 'owner' && !req.user.apps.map(a => a.appId).includes(user.appId)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        res.status(200).json(sanitizeUser(user));
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving user', error: err });
    }
};

// 🧱 Tạo user
exports.createUser = async (req, res) => {
    const { email, password, username, role = 'user' } = req.body;
    const appId = req.headers['x-app-id'];
    if (!appId) return res.status(400).json({ message: 'x-app-id header required' });
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    try {
        const exists = await UserSchema.findOne({ "profile.email": email, appId });
        if (exists) return res.status(400).json({ message: 'User already exists in this app' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new UserSchema({
            profile: { email, username },
            password: hashedPassword,
            appId,
            role
        });

        await user.save();

        // Generate tokens like in loginUser
        const accessToken = generateAccessToken({
            id: user._id,
            email: user.profile.email,
            role: user.role,
            appId: user.appId
        });
        const refreshToken = generateRefreshToken(user._id);
        await addUserRefreshToken(user._id, refreshToken, accessToken);

        res.status(201).json({
            message: 'User created successfully',
            user: {
                _id: user._id,
                email: user.profile.email,
                username: user.profile.username,
                role: user.role
            },
            accessToken,
            refreshToken
        });
    } catch (err) {
        res.status(500).json({ message: 'Error creating user', error: err.message });
    }
};

// 📝 Cập nhật user
exports.updateUser = async (req, res) => {
    const userId = req.params.id;
    const { username, email } = req.body;

    try {
        const user = await UserSchema.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (req.user.role === 'owner' && !req.user.apps.map(a => a.appId).includes(user.appId)) {
            return res.status(403).json({ message: 'Cannot update user in this app' });
        }

        if (username) user.profile.username = username;
        if (email) user.profile.email = email;
        await user.save();

        res.status(200).json(sanitizeUser(user));
    } catch (err) {
        res.status(500).json({ message: 'Error updating user', error: err });
    }
};

// 🗑️ Xóa user
exports.deleteUser = async (req, res) => {
    const userId = req.params.id;

    try {
        const user = await UserSchema.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        await user.deleteOne();
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting user', error: err });
    }
};

// 🔑 Login user
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    const appId = req.headers['x-app-id'];
    if (!appId) return res.status(400).json({ message: 'x-app-id header required' });

    try {
        const user = await UserSchema.findOne({ "profile.email": email, appId });
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        // CRITICAL: Include appId and role in JWT token
        const accessToken = generateAccessToken({
            id: user._id,
            email: user.profile.email,
            role: user.role,
            appId: user.appId
        });
        const refreshToken = generateRefreshToken(user._id);
        await addUserRefreshToken(user._id, refreshToken, accessToken);

        res.status(200).json({
            user: {
                id: user._id,
                email: user.profile.email,
                username: user.profile.username,
                role: user.role
            },
            accessToken,
            refreshToken
        });
    } catch (err) {
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
        await deleteUserRefreshToken(req.user._id, accessToken);
        res.status(200).json({ message: 'Logout successful' });
    } catch (err) {
        res.status(500).json({ message: 'Error during logout', error: err });
    }
};

// 🔄 Change password
exports.changePassword = async (req, res) => {
    const userId = req.params.id;
    const { oldPassword, newPassword } = req.body;

    try {
        const user = await UserSchema.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid old password' });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        res.status(200).json({ message: 'Password changed successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error changing password', error: err });
    }
};

// 📊 Lấy thống kê user trong app
exports.getAppStats = async (req, res) => {
    const appId = req.headers['x-app-id'];
    if (!appId) return res.status(400).json({ message: 'x-app-id header required' });

    try {
        const totalUsers = await UserSchema.countDocuments({ appId });
        res.status(200).json({ totalUsers });
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving user stats', error: err });
    }
};
