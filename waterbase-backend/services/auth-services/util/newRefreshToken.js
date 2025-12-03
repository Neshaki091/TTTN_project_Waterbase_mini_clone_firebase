const { generateAccessToken, getOwnerRefreshToken, getUserRefreshToken } = require('../helpers/tokenHelper');

exports.refreshOwnerAccessToken = async (req, res) => {
    try {
        const { userId } = req.body; // client gửi userId
        const internalRefreshToken = getOwnerRefreshToken(userId);

        if (!internalRefreshToken) return res.status(403).json({ message: 'Refresh token revoked or missing' });

        // Tạo access token mới
        const newAccessToken = generateAccessToken({ id: userId });
        res.status(200).json({ accessToken: newAccessToken });
    } catch (err) {
        res.status(401).json({ message: 'Cannot refresh access token', error: err.message });
    }
};

exports.refreshUserAccessToken = async (req, res) => {
    try {
        const { userId } = req.body; // client gửi userId
        const internalRefreshToken = getUserRefreshToken(userId);
        if (!internalRefreshToken) return res.status(403).json({ message: 'Refresh token revoked or missing' });
        // Tạo access token mới
        const newAccessToken = generateAccessToken({ id: userId });
        res.status(200).json({ accessToken: newAccessToken });
    }
    catch (err) {
        res.status(401).json({ message: 'Cannot refresh access token', error: err.message });
    }
};

