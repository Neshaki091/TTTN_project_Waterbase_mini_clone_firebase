const jwt = require('jsonwebtoken');
const {
    generateAccessToken,
    generateRefreshToken,
    getOwnerRefreshToken,
    getUserRefreshToken,
    addOwnerRefreshToken,
    addUserRefreshToken,
    deleteOwnerRefreshToken,
    deleteUserRefreshToken
} = require('./refreshToken');

/**
 * Refresh Owner Access Token with Token Rotation (Firebase-style)
 * Mỗi lần refresh sẽ tạo REFRESH TOKEN MỚI và revoke token cũ
 */
exports.refreshOwnerAccessToken = async (req, res) => {
    try {
        // Đọc refresh token từ request body
        const { refreshToken: oldRefreshToken } = req.body;

        if (!oldRefreshToken) {
            return res.status(400).json({ message: 'Refresh token is required' });
        }

        // Verify old refresh token
        let decoded;
        try {
            decoded = jwt.verify(oldRefreshToken, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Refresh token expired' });
            }
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        // Check if refresh token type
        if (decoded.type !== 'refresh') {
            return res.status(401).json({ message: 'Invalid token type' });
        }

        const userId = decoded.id;

        // Verify old refresh token exists in database
        const tokenEntry = await getOwnerRefreshToken(userId, oldRefreshToken);
        if (!tokenEntry) {
            // Token reuse detected! Possible attack
            console.warn(`⚠️ Token reuse detected for owner ${userId}`);
            return res.status(403).json({ message: 'Refresh token revoked or not found' });
        }

        // Get owner data to create new access token with full payload
        const OwnerSchema = require('../models/owner.model');
        const owner = await OwnerSchema.findById(userId);

        if (!owner) {
            return res.status(404).json({ message: 'Owner not found' });
        }

        // 🔥 TOKEN ROTATION: Generate NEW tokens
        const newAccessToken = generateAccessToken({
            id: owner._id,
            email: owner.profile?.email,
            role: owner.role,
            apps: owner.apps
        });

        const newRefreshToken = generateRefreshToken(owner._id);

        // ✅ Revoke old refresh token (critical for security)
        await deleteOwnerRefreshToken(userId, tokenEntry.accessToken);

        // ✅ Save new refresh token
        await addOwnerRefreshToken(userId, newRefreshToken, newAccessToken);

        // 🔥 Return BOTH new tokens (Firebase-style)
        res.status(200).json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,  // ← NEW refresh token!
            message: 'Tokens refreshed successfully'
        });
    } catch (err) {
        console.error('Refresh owner token error:', err);
        res.status(500).json({ message: 'Cannot refresh access token', error: err.message });
    }
};

/**
 * Refresh User Access Token with Token Rotation (Firebase-style)
 * Mỗi lần refresh sẽ tạo REFRESH TOKEN MỚI và revoke token cũ
 */
exports.refreshUserAccessToken = async (req, res) => {
    try {
        // Đọc refresh token từ request body
        const { refreshToken: oldRefreshToken } = req.body;

        if (!oldRefreshToken) {
            return res.status(400).json({ message: 'Refresh token is required' });
        }

        // Verify old refresh token
        let decoded;
        try {
            decoded = jwt.verify(oldRefreshToken, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Refresh token expired' });
            }
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        // Check if refresh token type
        if (decoded.type !== 'refresh') {
            return res.status(401).json({ message: 'Invalid token type' });
        }

        const userId = decoded.id;

        // Verify old refresh token exists in database
        const tokenEntry = await getUserRefreshToken(userId, oldRefreshToken);
        if (!tokenEntry) {
            // Token reuse detected! Possible attack
            console.warn(`⚠️ Token reuse detected for user ${userId}`);
            return res.status(403).json({ message: 'Refresh token revoked or not found' });
        }

        // Get user data to create new access token with full payload
        const UserSchema = require('../models/user.model');
        const user = await UserSchema.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 🔥 TOKEN ROTATION: Generate NEW tokens
        const newAccessToken = generateAccessToken({
            id: user._id,
            email: user.profile.email,
            role: user.role,
            appId: user.appId
        });

        const newRefreshToken = generateRefreshToken(user._id);

        // ✅ Revoke old refresh token (critical for security)
        await deleteUserRefreshToken(userId, tokenEntry.accessToken);

        // ✅ Save new refresh token
        await addUserRefreshToken(userId, newRefreshToken, newAccessToken);

        // 🔥 Return BOTH new tokens (Firebase-style)
        res.status(200).json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,  // ← NEW refresh token!
            message: 'Tokens refreshed successfully'
        });
    } catch (err) {
        console.error('Refresh user token error:', err);
        res.status(500).json({ message: 'Cannot refresh access token', error: err.message });
    }
};
