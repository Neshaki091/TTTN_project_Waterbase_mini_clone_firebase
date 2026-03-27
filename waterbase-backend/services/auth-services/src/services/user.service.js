const userRepository = require('../repositories/user.repository');
const bcrypt = require('bcrypt');
const {
    generateAccessToken,
    generateRefreshToken,
    addUserRefreshToken,
    deleteUserRefreshToken
} = require('../../util/refreshToken');

// 🧠 Lấy tất cả user trong app
exports.getAllUsersInApp = async (appId) => {
    return userRepository.findAllByAppId(appId);
};

// 🔍 Lấy user theo ID
exports.getUserById = async (userId, requester) => {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    if (requester && requester.role === 'owner' && !requester.apps.map(a => a.appId).includes(user.appId)) {
        throw new Error('Forbidden');
    }

    return user;
};

// 🧱 Tạo user
exports.createUser = async (appId, userData) => {
    const { email, password, username, role = 'user' } = userData;

    const exists = await userRepository.findByEmailAndAppId(email, appId);
    if (exists) throw new Error('User already exists in this app');

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userRepository.create({
        profile: { email, username },
        password: hashedPassword,
        appId,
        role
    });

    const accessToken = generateAccessToken({
        id: user._id,
        email: user.profile.email,
        role: user.role,
        appId: user.appId
    });
    const refreshToken = generateRefreshToken(user._id);
    await addUserRefreshToken(user._id, refreshToken, accessToken);

    return { user, accessToken, refreshToken };
};

// 📝 Cập nhật user
exports.updateUser = async (userId, updateData, requester) => {
    const { username, email } = updateData;

    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    if (requester && requester.role === 'owner' && !requester.apps.map(a => a.appId).includes(user.appId)) {
        throw new Error('Cannot update user in this app');
    }

    const updates = {};
    if (username) updates['profile.username'] = username;
    if (email) updates['profile.email'] = email;
    
    return userRepository.update(userId, { $set: updates });
};

// 🗑️ Xóa user
exports.deleteUser = async (userId) => {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');
    await userRepository.delete(userId);
    return true;
};

// 🔑 Login user
exports.loginUser = async (appId, email, password) => {
    const user = await userRepository.findByEmailAndAppId(email, appId);
    if (!user) throw new Error('Invalid credentials');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error('Invalid credentials');

    if (!user.isActive) {
        throw new Error('Account is locked');
    }

    const accessToken = generateAccessToken({
        id: user._id,
        email: user.profile.email,
        role: user.role,
        appId: user.appId
    });
    const refreshToken = generateRefreshToken(user._id);
    await addUserRefreshToken(user._id, refreshToken, accessToken);

    return { user, accessToken, refreshToken };
};

// 🚪 Logout user
exports.logoutUser = async (userId, accessToken) => {
    await deleteUserRefreshToken(userId, accessToken);
};

// 🔄 Change password
exports.changePassword = async (userId, oldPassword, newPassword) => {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) throw new Error('Invalid old password');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userRepository.update(userId, { password: hashedPassword });
    return true;
};

// 🔒 Khóa/Mở khóa user
exports.toggleUserStatus = async (userId, isActive, requester) => {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    if (requester && requester.role === 'owner' && !requester.apps.map(a => a.appId).includes(user.appId)) {
        throw new Error('Forbidden');
    }

    return userRepository.update(userId, { isActive });
};

// 📊 Lấy thống kê user trong app
exports.getAppStats = async (appId) => {
    const totalUsers = await userRepository.countByAppId(appId);
    return { totalUsers };
};
