const axios = require('axios');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3000';

exports.databaseAuthMiddleware = (allowedRoles = []) => {
    return async (req, res, next) => {
        const authHeader = req.headers["authorization"];

        // 1️⃣ Không có token → trả về đúng lỗi
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];
        const clientAppId = req.headers["x-app-id"] || "";

        try {
            // 2️⃣ Verify token tại Auth Service
            const verifyResponse = await axios.get(`${AUTH_SERVICE_URL}/verify`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "X-App-Id": clientAppId // Owner không cần appId → backend sẽ bỏ qua
                }
            });

            const user = verifyResponse.data.user;
            req.user = user;

            // 3️⃣ Xử lý quyền
            if (user.role === "owner") {
                // Owner → không cần appId
                req.appId = clientAppId || null;
            } else {
                // User → phải có appId
                req.appId = clientAppId || user.appId;
                if (!req.appId) {
                    return res.status(400).json({
                        message: "Missing appId for user access"
                    });
                }
            }

            // 4️⃣ Role validation
            if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
                return res.status(403).json({ message: "Insufficient permissions" });
            }

            return next();

        } catch (error) {
            // 5️⃣ Token sai / verify fail → không trả về "No token provided" nữa
            if (error.response) {
                return res.status(error.response.status).json({
                    message: "Token verification failed",
                    error: error.response.data
                });
            }

            return res.status(500).json({
                message: "Authentication error",
                error: error.message
            });
        }
    };
};
