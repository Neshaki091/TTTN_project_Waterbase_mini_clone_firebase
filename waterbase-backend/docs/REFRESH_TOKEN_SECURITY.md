# Refresh Token Security - HTTP-only Cookie vs Response Body

## ⚠️ Vấn đề Bảo mật

Bạn đúng! Trả refresh token trong JSON response **có rủi ro**:

### Rủi ro khi trả trong Response Body
```javascript
// ❌ KHÔNG AN TOÀN
res.json({
    accessToken: "eyJ...",
    refreshToken: "eyJ..."  // ← Có thể bị đánh cắp qua XSS
});
```

**Lý do:**
- ✅ Refresh token được lưu trong `localStorage`
- ⚠️ `localStorage` có thể bị truy cập bởi JavaScript
- ⚠️ Nếu có lỗ hổng XSS, attacker có thể đánh cắp refresh token
- ⚠️ Refresh token có thời hạn dài (7 ngày) → nguy hiểm hơn access token

## ✅ Giải pháp 1: HTTP-only Cookie (Khuyến nghị - Giống Firebase)

### Backend Implementation

```javascript
// owner.controller.js - loginOwner
exports.loginOwner = async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const owner = await OwnerSchema.findOne({ "profile.email": email });
        if (!owner) return res.status(404).json({ message: 'Owner not found' });

        const isMatch = await bcrypt.compare(password, owner.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid password' });

        const accessTokenPayload = {
            id: owner._id,
            role: owner.role,
            apps: owner.apps
        };
        const accessToken = generateAccessToken(accessTokenPayload);
        const refreshToken = generateRefreshToken(owner._id);
        
        await addOwnerRefreshToken(owner._id, refreshToken, accessToken);

        // ✅ Set refresh token as HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,      // Không thể truy cập qua JavaScript
            secure: true,        // Chỉ gửi qua HTTPS
            sameSite: 'strict',  // Chống CSRF
            maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
        });

        // ❌ KHÔNG trả refresh token trong body
        res.status(200).json({
            owner: sanitizeOwner(owner),
            accessToken  // Chỉ trả access token
        });
    } catch (err) {
        res.status(500).json({ message: 'Error during login', error: err });
    }
};
```

### Refresh Token Endpoint

```javascript
// newRefreshToken.js
exports.refreshOwnerAccessToken = async (req, res) => {
    try {
        // ✅ Đọc refresh token từ cookie
        const refreshToken = req.cookies.refreshToken;
        
        if (!refreshToken) {
            return res.status(400).json({ message: 'Refresh token is required' });
        }

        // Verify refresh token
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                // Clear expired cookie
                res.clearCookie('refreshToken');
                return res.status(401).json({ message: 'Refresh token expired' });
            }
            return res.status(401).json({ message: 'Invalid refresh token' });
        }

        if (decoded.type !== 'refresh') {
            return res.status(401).json({ message: 'Invalid token type' });
        }

        const userId = decoded.id;

        // Verify refresh token exists in database
        const tokenEntry = await getOwnerRefreshToken(userId, refreshToken);
        if (!tokenEntry) {
            res.clearCookie('refreshToken');
            return res.status(403).json({ message: 'Refresh token revoked or not found' });
        }

        // Get owner data
        const OwnerSchema = require('../models/owner.model');
        const owner = await OwnerSchema.findById(userId);
        
        if (!owner) {
            return res.status(404).json({ message: 'Owner not found' });
        }

        // Generate new access token
        const newAccessToken = generateAccessToken({
            id: owner._id,
            email: owner.email,
            role: owner.role,
            apps: owner.apps
        });

        res.status(200).json({ 
            accessToken: newAccessToken,
            message: 'Access token refreshed successfully'
        });
    } catch (err) {
        console.error('Refresh owner token error:', err);
        res.status(500).json({ message: 'Cannot refresh access token', error: err.message });
    }
};
```

### SDK Update (Client)

```javascript
// core/client.js - _handleTokenRefresh
async _handleTokenRefresh(useOwnerToken = false) {
    const endpoint = useOwnerToken 
        ? '/api/v1/auth/owners/refresh-token'
        : '/api/v1/auth/users/refresh-token';

    this.isRefreshing = true;
    
    this.refreshPromise = (async () => {
        try {
            if (this.config.debug) {
                console.log('[Waterbase] Refreshing token automatically...');
            }

            // ✅ Không cần gửi refresh token - server đọc từ cookie
            const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-app-id': this.config.appId
                },
                credentials: 'include'  // ← QUAN TRỌNG: Gửi cookies
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();
            
            // Update access token
            if (useOwnerToken) {
                this.ownerToken = data.accessToken;
                localStorage.setItem('waterbase_owner_token', data.accessToken);
            } else {
                this.token = data.accessToken;
                localStorage.setItem('waterbase_token', data.accessToken);
            }

            if (this.config.debug) {
                console.log('[Waterbase] Token refreshed successfully');
            }

            return true;
        } catch (error) {
            if (this.config.debug) {
                console.error('[Waterbase] Token refresh failed:', error.message);
            }
            
            // Clear tokens on refresh failure
            if (useOwnerToken) {
                this.setOwnerToken(null);
                localStorage.removeItem('waterbase_owner');
            } else {
                this.setToken(null);
                localStorage.removeItem('waterbase_user');
            }
            
            return false;
        } finally {
            this.isRefreshing = false;
            this.refreshPromise = null;
        }
    })();

    return this.refreshPromise;
}
```

### Auth Module Update

```javascript
// modules/auth.js
async loginOwner(email, password) {
    if (!email || !password) {
        throw new ValidationError('Email and password are required');
    }

    const response = await this.client.post('/api/v1/auth/owners/login', {
        email,
        password
    }, {
        credentials: 'include'  // ← Nhận cookies
    });

    if (response.accessToken) {
        // ✅ Chỉ lưu access token
        this.client.setOwnerToken(response.accessToken);
        this.currentOwner = response.owner || response;
        localStorage.setItem('waterbase_owner', JSON.stringify(this.currentOwner));
    }

    return response;
}
```

## ✅ Giải pháp 2: Giữ nguyên Response Body (Đơn giản hơn)

Nếu không muốn dùng cookie, có thể giữ nguyên cách hiện tại nhưng **cải thiện bảo mật**:

### 1. Thêm CSP Headers (Content Security Policy)

```javascript
// Nginx hoặc Express middleware
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'"
    );
    next();
});
```

### 2. Implement XSS Protection

```javascript
// Sử dụng helmet.js
const helmet = require('helmet');
app.use(helmet());
```

### 3. Educate Developers

Trong documentation, cảnh báo rõ ràng:

```markdown
⚠️ **Security Warning:**
Refresh tokens are stored in localStorage. Ensure your application:
1. Has no XSS vulnerabilities
2. Uses HTTPS only
3. Implements CSP headers
4. Sanitizes all user inputs
```

## 📊 So sánh 2 Giải pháp

| Tiêu chí | HTTP-only Cookie | Response Body |
|----------|------------------|---------------|
| **Bảo mật XSS** | ✅ Cao (JS không truy cập được) | ⚠️ Thấp (có thể bị đánh cắp) |
| **CSRF Protection** | ⚠️ Cần SameSite cookie | ✅ Không lo CSRF |
| **Cross-domain** | ⚠️ Khó khăn hơn | ✅ Dễ dàng |
| **Mobile App** | ❌ Không hỗ trợ tốt | ✅ Hoạt động tốt |
| **Implementation** | 🔧 Phức tạp hơn | ✅ Đơn giản |
| **Firebase sử dụng** | ✅ Yes | ❌ No |

## 🎯 Khuyến nghị

### Cho Web App: HTTP-only Cookie
- ✅ Bảo mật tốt nhất
- ✅ Giống Firebase
- ⚠️ Cần cấu hình CORS và SameSite

### Cho Mobile App / Cross-domain: Response Body
- ✅ Đơn giản, dễ implement
- ✅ Hoạt động tốt với React Native
- ⚠️ Cần giáo dục developer về XSS

## 🔧 Hybrid Approach (Tốt nhất)

Hỗ trợ CẢ HAI:

```javascript
exports.loginOwner = async (req, res) => {
    // ... authentication logic

    const accessToken = generateAccessToken(accessTokenPayload);
    const refreshToken = generateRefreshToken(owner._id);
    
    await addOwnerRefreshToken(owner._id, refreshToken, accessToken);

    // Check if client wants cookie-based refresh
    const useCookie = req.headers['x-use-cookie'] === 'true';

    if (useCookie) {
        // ✅ Set HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            owner: sanitizeOwner(owner),
            accessToken
        });
    } else {
        // ✅ Return in body (for mobile apps)
        res.status(200).json({
            owner: sanitizeOwner(owner),
            accessToken,
            refreshToken
        });
    }
};
```

## 📝 Kết luận

**Waterbase hiện tại:**
- Trả refresh token trong response body
- Phù hợp cho mobile apps
- Cần cảnh báo về XSS trong docs

**Nên nâng cấp:**
- Implement HTTP-only cookie cho web apps
- Giữ response body cho mobile apps
- Cho phép client chọn phương thức

**Ưu tiên:**
1. Thêm Helmet.js và CSP headers (ngay lập tức)
2. Implement HTTP-only cookie option (tuần tới)
3. Update SDK để hỗ trợ cả 2 modes (sau đó)
