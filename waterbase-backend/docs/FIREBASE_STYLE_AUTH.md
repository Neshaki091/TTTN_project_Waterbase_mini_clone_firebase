# 🔥 Firebase-style Authentication - Token Rotation Guide

## Overview

Waterbase hiện sử dụng **Firebase-style authentication** với **automatic token rotation** để đảm bảo bảo mật cao nhất mà vẫn hỗ trợ mọi platform.

## 🎯 Key Features

### ✅ Universal Platform Support
- **Web Apps** (React, Vue, Angular)
- **Mobile Apps** (React Native, Flutter)
- **Desktop Apps** (Electron)
- **Backend Services** (Node.js, Python)

### 🔥 Token Rotation (Giống Firebase)
Mỗi lần refresh, server tạo **REFRESH TOKEN MỚI** và revoke token cũ:

```javascript
// Request
POST /api/v1/auth/owners/refresh-token
{
  "refreshToken": "old_token_abc123"
}

// Response
{
  "accessToken": "new_access_token_xyz",
  "refreshToken": "NEW_refresh_token_def456",  // ← MỚI!
  "message": "Tokens refreshed successfully"
}
```

### 🛡️ Security Benefits

| Feature | Benefit |
|---------|---------|
| **Token Rotation** | Old refresh token bị revoke ngay lập tức |
| **Token Reuse Detection** | Phát hiện nếu token cũ bị dùng lại (attack) |
| **Short-lived Access Token** | 15 minutes expiration |
| **Long-lived Refresh Token** | 7 days, nhưng rotate mỗi lần dùng |
| **Database Validation** | Mọi refresh token đều được verify trong DB |

## 📖 Usage Guide

### 1. Login (Nhận cả 2 tokens)

```javascript
// Owner Login
POST /api/v1/auth/owners/login
{
  "email": "owner@example.com",
  "password": "password123"
}

// Response
{
  "owner": {...},
  "accessToken": "eyJ...",     // 15 minutes
  "refreshToken": "AIza..."    // 7 days
}
```

**Client lưu trữ:**
- `accessToken` → Memory (không persist)
- `refreshToken` → localStorage (Web) hoặc SecureStore (Mobile)

### 2. API Requests (Dùng Access Token)

```javascript
GET /api/v1/waterdb/todos
Headers:
  Authorization: Bearer <accessToken>
  X-App-Id: <appId>
```

### 3. Auto Refresh (Khi Access Token hết hạn)

```javascript
// SDK tự động phát hiện 401 error
// → Gọi refresh endpoint
POST /api/v1/auth/owners/refresh-token
{
  "refreshToken": "current_refresh_token"
}

// Response (Token Rotation!)
{
  "accessToken": "new_access_token",
  "refreshToken": "NEW_refresh_token",  // ← Khác với token cũ!
  "message": "Tokens refreshed successfully"
}

// SDK tự động:
// 1. Lưu new access token
// 2. Lưu NEW refresh token (thay thế token cũ)
// 3. Retry request ban đầu
```

## 🔐 Security Deep Dive

### Token Rotation Flow

```
┌─────────────────────────────────────────────────────┐
│ Client có:                                          │
│ - accessToken: "abc123" (expired)                   │
│ - refreshToken: "old_xyz"                           │
└─────────────────────────────────────────────────────┘
                    │
                    │ 1. POST /refresh-token
                    │    { refreshToken: "old_xyz" }
                    ▼
┌─────────────────────────────────────────────────────┐
│ Server:                                             │
│ 1. Verify "old_xyz" trong database ✅               │
│ 2. Generate new accessToken: "def456"              │
│ 3. Generate NEW refreshToken: "new_abc"            │
│ 4. DELETE "old_xyz" từ database ❌                  │
│ 5. SAVE "new_abc" vào database ✅                   │
└─────────────────────────────────────────────────────┘
                    │
                    │ 2. Response
                    │    { accessToken: "def456",
                    │      refreshToken: "new_abc" }
                    ▼
┌─────────────────────────────────────────────────────┐
│ Client update:                                      │
│ - accessToken: "def456" ✅                          │
│ - refreshToken: "new_abc" ✅                        │
│                                                     │
│ Old "old_xyz" KHÔNG THỂ dùng lại!                  │
└─────────────────────────────────────────────────────┘
```

### Token Reuse Attack Detection

```javascript
// Scenario: Attacker đánh cắp refresh token "old_xyz"

// User (legitimate) refresh first:
POST /refresh-token { refreshToken: "old_xyz" }
→ Success! New token: "new_abc"
→ "old_xyz" bị revoke

// Attacker tries to use stolen token:
POST /refresh-token { refreshToken: "old_xyz" }
→ 403 Forbidden: "Refresh token revoked or not found"
→ Server logs: ⚠️ Token reuse detected!
```

## 💻 Client Implementation

### React.js Web App

```javascript
import Waterbase from 'waterbase-sdk';

const waterbase = new Waterbase({
    apiUrl: 'https://api.waterbase.click',
    appId: 'my-app',
    debug: true  // See token rotation logs
});

// Login
const { owner, accessToken, refreshToken } = await waterbase.auth.loginOwner(
    'owner@example.com',
    'password'
);

// SDK tự động lưu cả 2 tokens
// localStorage.setItem('waterbase_owner_token', accessToken);
// localStorage.setItem('waterbase_owner_refresh_token', refreshToken);

// Sử dụng API bình thường
const apps = await waterbase.apps.list();
// ↑ Nếu accessToken hết hạn:
//   1. SDK auto gọi /refresh-token với refreshToken
//   2. Nhận new accessToken + NEW refreshToken
//   3. Update localStorage với tokens mới
//   4. Retry request
//   5. User không biết gì cả! ✨
```

### React Native Mobile App

```javascript
import Waterbase from 'waterbase-sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';

const waterbase = new Waterbase({
    apiUrl: 'https://api.waterbase.click',
    appId: 'mobile-app'
});

// Login
const { user, accessToken, refreshToken } = await waterbase.auth.loginUser(
    'user@example.com',
    'password'
);

// Lưu vào AsyncStorage
await AsyncStorage.setItem('access_token', accessToken);
await AsyncStorage.setItem('refresh_token', refreshToken);

// Sử dụng
const todos = await waterbase.db.collection('todos').get();
// Auto-refresh hoạt động giống hệt web!
```

### Flutter Mobile App

```dart
// Using Dio HTTP client
final dio = Dio();

// Interceptor for auto-refresh
dio.interceptors.add(InterceptorsWrapper(
  onError: (error, handler) async {
    if (error.response?.statusCode == 401) {
      // Get refresh token from secure storage
      final refreshToken = await storage.read(key: 'refresh_token');
      
      // Refresh tokens
      final response = await dio.post(
        '/api/v1/auth/users/refresh-token',
        data: {'refreshToken': refreshToken}
      );
      
      // Save NEW tokens (Token Rotation!)
      await storage.write(key: 'access_token', value: response.data['accessToken']);
      await storage.write(key: 'refresh_token', value: response.data['refreshToken']);
      
      // Retry original request
      return handler.resolve(await dio.fetch(error.requestOptions));
    }
    return handler.next(error);
  },
));
```

## 📊 Comparison with Other Approaches

| Approach | Waterbase (Firebase-style) | HTTP-only Cookie | No Rotation |
|----------|---------------------------|------------------|-------------|
| **Platform Support** | ✅ All platforms | ❌ Web only | ✅ All platforms |
| **XSS Protection** | ⚠️ Vulnerable | ✅ Protected | ⚠️ Vulnerable |
| **Token Reuse Protection** | ✅ Yes (rotation) | ⚠️ Depends | ❌ No |
| **CSRF Protection** | ✅ Not needed | ⚠️ Needs SameSite | ✅ Not needed |
| **Complexity** | ⚠️ Medium | 🔧 High | ✅ Low |
| **Security Level** | ✅ High | ✅ High | ⚠️ Medium |
| **Firebase Compatible** | ✅ Yes | ❌ No | ⚠️ Partial |

## 🔧 Advanced: Manual Token Refresh

```javascript
// Nếu cần refresh manually (rare case)
const response = await fetch('https://api.waterbase.click/api/v1/auth/owners/refresh-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        refreshToken: localStorage.getItem('waterbase_owner_refresh_token')
    })
});

const { accessToken, refreshToken: newRefreshToken } = await response.json();

// CRITICAL: Update BOTH tokens!
localStorage.setItem('waterbase_owner_token', accessToken);
localStorage.setItem('waterbase_owner_refresh_token', newRefreshToken);  // ← MỚI!
```

## 🐛 Troubleshooting

### Issue: "Refresh token revoked or not found"

**Possible Causes:**
1. Token đã được dùng để refresh (rotation)
2. User đã logout
3. Token reuse attack detected

**Solution:**
```javascript
// Redirect to login
localStorage.clear();
window.location.href = '/login';
```

### Issue: Tokens không update sau refresh

**Cause:** Quên lưu NEW refresh token

**Solution:**
```javascript
// ❌ WRONG
localStorage.setItem('token', data.accessToken);
// Quên lưu refreshToken mới!

// ✅ CORRECT
localStorage.setItem('token', data.accessToken);
localStorage.setItem('refresh_token', data.refreshToken);  // ← QUAN TRỌNG!
```

## 📝 Migration from HTTP-only Cookie

Nếu bạn đang dùng HTTP-only cookie approach:

```javascript
// Before (HTTP-only cookie)
// Login response:
{
  "accessToken": "...",
  // refreshToken in cookie
}

// After (Firebase-style)
// Login response:
{
  "accessToken": "...",
  "refreshToken": "..."  // ← Trong response body
}

// Update client code:
const { accessToken, refreshToken } = await login(...);
localStorage.setItem('access_token', accessToken);
localStorage.setItem('refresh_token', refreshToken);  // ← Thêm dòng này
```

## 🎉 Best Practices

1. **Always update BOTH tokens** sau khi refresh
2. **Never log refresh tokens** (security risk)
3. **Clear tokens on logout**
4. **Implement rate limiting** cho refresh endpoint
5. **Monitor token reuse** trong logs
6. **Use HTTPS only** trong production
7. **Implement CSP headers** để giảm XSS risk

## 🔗 Related Documentation

- [Refresh Token Implementation Guide](./REFRESH_TOKEN_GUIDE.md)
- [Security Audit Report](../../security.md)
- [SDK Auto-Refresh Guide](../../waterbase-sdk/AUTO_REFRESH_GUIDE.md)

---

**Version:** 4.0.0 (Firebase-style)  
**Updated:** 2025-12-10  
**Author:** Waterbase Team

**🔥 Waterbase now works exactly like Firebase! 🔥**
