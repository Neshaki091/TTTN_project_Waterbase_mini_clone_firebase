// util/refreshToken.js
const jwt = require('jsonwebtoken');
const OwnerSchema = require('../models/owner.model');
const UserSchema = require('../models/user.model'); // Đổi tên biến để nhất quán

// Hàm tạo Access Token nhận payload đầy đủ
// Dùng expiresIn ngắn hơn (15 phút) để an toàn hơn
const generateAccessToken = (payload) => {
    // Payload có thể là { id: userId, role: 'owner', apps: [...] }
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
}

const generateRefreshToken = (userId) => {
    // Refresh Token nên có expiresIn dài hơn (vd: 7d)
    return jwt.sign({ id: userId, type: 'refresh' }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// Lưu ý: Các hàm get/add/delete dưới đây nên dùng Model đã import
const getOwnerRefreshToken = async (userId, refreshToken) => {
    const owner = await OwnerSchema.findById(userId);
    if (!owner) return null;
    const tokenEntry = owner.tokens.find(tokenObj => tokenObj.refreshToken === refreshToken);
    return tokenEntry || null;
};

const getUserRefreshToken = async (userId, refreshToken) => {
    const user = await UserSchema.findById(userId);
    if (!user) return null;
    const tokenEntry = user.tokens.find(tokenObj => tokenObj.refreshToken === refreshToken);
    return tokenEntry || null;
}

const addOwnerRefreshToken = async (userId, refreshToken, accessToken) => {
    await OwnerSchema.findByIdAndUpdate(
        userId,
        { $push: { tokens: { refreshToken: refreshToken, accessToken: accessToken, createdAt: Date.now() } } },
        { new: true }
    );
};

// Sửa: Hàm xóa token hiện tại chỉ xóa bằng AccessToken trong DB (cho cơ chế Logout)
const deleteOwnerRefreshToken = async (userId, accessToken) => {
    await OwnerSchema.findByIdAndUpdate(
        userId,
        { $pull: { tokens: { accessToken: accessToken } } },
        { new: true }
    );
};

const addUserRefreshToken = async (userId, refreshToken, accessToken) => {
    await UserSchema.findByIdAndUpdate(
        userId,
        { $push: { tokens: { refreshToken: refreshToken, accessToken: accessToken, createdAt: Date.now() } } },
        { new: true }
    );
}

const deleteUserRefreshToken = async (userId, accessToken) => {
    await UserSchema.findByIdAndUpdate(
        userId,
        { $pull: { tokens: { accessToken: accessToken } } },
        { new: true }
    );
}

module.exports = {
    generateRefreshToken,
    generateAccessToken,
    addOwnerRefreshToken,
    deleteOwnerRefreshToken,
    addUserRefreshToken,
    deleteUserRefreshToken,
    getOwnerRefreshToken,
    getUserRefreshToken
};