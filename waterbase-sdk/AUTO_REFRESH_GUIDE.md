# Waterbase SDK v3.1 - Auto Token Refresh Guide

## 🎉 Firebase-like Auto Refresh

Waterbase SDK giờ đây tự động làm mới token khi hết hạn, **giống Firebase** - developer không cần làm gì cả!

## ✨ Tính năng Mới

### Automatic Token Refresh
- ✅ Tự động phát hiện token hết hạn (401 error)
- ✅ Tự động gọi refresh token endpoint
- ✅ Tự động retry request với token mới
- ✅ Ngăn chặn multiple concurrent refresh requests
- ✅ Tự động clear tokens khi refresh thất bại

### Transparent to Developers
```javascript
// Developer chỉ cần login một lần
await waterbase.auth.loginUser('user@example.com', 'password');

// Sau đó gọi API bình thường, SDK tự động xử lý token expiration
const todos = await waterbase.db.collection('todos').get();
// ↑ Nếu token hết hạn, SDK tự động refresh và retry!
```

## 📖 Cách Sử dụng

### 1. Khởi tạo SDK

```javascript
import Waterbase from './waterbase-sdk/index.js';

const waterbase = new Waterbase({
    apiUrl: 'https://api.waterbase.click',
    appId: 'your-app-id',
    apiKey: 'your-api-key',  // Optional
    debug: true  // Enable để xem auto-refresh logs
});
```

### 2. Login (Refresh Token được lưu tự động)

```javascript
// User Login
const response = await waterbase.auth.loginUser('user@example.com', 'password');
console.log(response);
// {
//   user: {...},
//   accessToken: "eyJ...",  // 15 minutes
//   refreshToken: "eyJ..."  // 7 days - SDK tự động lưu
// }

// Owner Login
const ownerResponse = await waterbase.auth.loginOwner('owner@example.com', 'password');
// Tương tự, refresh token được lưu tự động
```

### 3. Sử dụng API bình thường

```javascript
// Gọi API bình thường, không cần lo token expiration
try {
    // Request 1
    const users = await waterbase.db.collection('users').get();
    
    // Request 2 (sau 15 phút, token hết hạn)
    const todos = await waterbase.db.collection('todos').get();
    // ↑ SDK tự động:
    //   1. Phát hiện 401 error
    //   2. Gọi /refresh-token
    //   3. Lưu access token mới
    //   4. Retry request
    //   5. Trả về data như bình thường
    
} catch (error) {
    // Chỉ catch khi refresh token cũng hết hạn (sau 7 ngày)
    if (error.message.includes('Authentication failed')) {
        console.log('Session expired, please login again');
        // Redirect to login
    }
}
```

## 🔍 Debug Mode

Enable debug để xem auto-refresh hoạt động:

```javascript
const waterbase = new Waterbase({
    apiUrl: 'https://api.waterbase.click',
    appId: 'your-app-id',
    debug: true  // ← Enable debug
});

// Console logs:
// [Waterbase] POST https://api.waterbase.click/api/v1/waterdb/todos
// [Waterbase] Refreshing token automatically...
// [Waterbase] Token refreshed successfully
// [Waterbase] Token refreshed, retrying request...
// [Waterbase] POST https://api.waterbase.click/api/v1/waterdb/todos (retry)
```

## 🎯 Use Cases

### Use Case 1: Long-running SPA

```javascript
// User login lúc 9:00 AM
await waterbase.auth.loginUser('user@example.com', 'password');

// User làm việc cả ngày, SDK tự động refresh mỗi 15 phút
// 9:15 AM - Auto refresh
// 9:30 AM - Auto refresh
// 10:00 AM - Auto refresh
// ...
// 5:00 PM - Vẫn hoạt động bình thường!

// Sau 7 ngày không sử dụng, refresh token hết hạn
// → User cần login lại
```

### Use Case 2: Mobile App

```javascript
// React Native App
import Waterbase from 'waterbase-sdk';

const waterbase = new Waterbase({
    apiUrl: 'https://api.waterbase.click',
    appId: 'mobile-app-123'
});

// Login once
await waterbase.auth.loginUser(email, password);

// App có thể sử dụng 7 ngày mà không cần login lại
// SDK tự động refresh access token mỗi 15 phút
```

### Use Case 3: Background Tasks

```javascript
// Node.js Background Worker
const waterbase = new Waterbase({
    apiUrl: 'https://api.waterbase.click',
    appId: 'worker-app'
});

// Login
await waterbase.auth.loginUser('worker@example.com', 'password');

// Chạy task mỗi 30 phút
setInterval(async () => {
    // SDK tự động refresh token nếu cần
    const data = await waterbase.db.collection('jobs').get();
    await processJobs(data);
}, 30 * 60 * 1000);
```

## 🔐 Security Features

### 1. Concurrent Request Prevention

```javascript
// Multiple requests cùng lúc khi token hết hạn
Promise.all([
    waterbase.db.collection('users').get(),
    waterbase.db.collection('todos').get(),
    waterbase.db.collection('posts').get()
]);

// SDK chỉ gọi refresh token MỘT LẦN
// Các requests khác đợi refresh hoàn thành
// Tất cả retry với token mới
```

### 2. Automatic Cleanup on Failure

```javascript
// Nếu refresh token thất bại (expired hoặc revoked)
// SDK tự động:
// 1. Clear access token
// 2. Clear refresh token
// 3. Clear user data
// 4. Throw AuthError

try {
    await waterbase.db.collection('todos').get();
} catch (error) {
    if (error.name === 'AuthError') {
        // Tokens đã bị clear, redirect to login
        window.location.href = '/login';
    }
}
```

### 3. Token Storage

```javascript
// Tokens được lưu trong localStorage:
localStorage.getItem('waterbase_token');              // Access token
localStorage.getItem('waterbase_refresh_token');      // Refresh token
localStorage.getItem('waterbase_user');               // User data

// Owner tokens:
localStorage.getItem('waterbase_owner_token');        // Owner access token
localStorage.getItem('waterbase_owner_refresh_token'); // Owner refresh token
localStorage.getItem('waterbase_owner');              // Owner data
```

## 📊 Flow Diagram

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 1. Login
       ├──────────────────────────────────────┐
       │                                      │
       │ 2. Store tokens                      │
       │    - accessToken (15m)               │
       │    - refreshToken (7d)               │
       │                                      │
       │ 3. API Request (after 15 min)        │
       ├──────────────────────────────────────►
       │                                      │
       │ 4. 401 Unauthorized                  │
       │◄──────────────────────────────────────┤
       │                                      │
       │ 5. Auto refresh (transparent)        │
       │    SDK calls /refresh-token          │
       │                                      │
       │ 6. New accessToken                   │
       │◄──────────────────────────────────────┤
       │                                      │
       │ 7. Retry original request            │
       ├──────────────────────────────────────►
       │                                      │
       │ 8. Success response                  │
       │◄──────────────────────────────────────┤
       │                                      │
       │ Developer sees success ✅            │
       │ (không biết có refresh)              │
       │                                      │
```

## 🆚 So sánh với Firebase

| Feature | Firebase | Waterbase SDK v3.1 |
|---------|----------|-------------------|
| Auto Token Refresh | ✅ Yes | ✅ Yes |
| Transparent to Developer | ✅ Yes | ✅ Yes |
| Concurrent Request Handling | ✅ Yes | ✅ Yes |
| Token Storage | ✅ Auto | ✅ Auto (localStorage) |
| Debug Logs | ✅ Yes | ✅ Yes (debug: true) |
| Manual Refresh Option | ❌ No | ✅ Yes (nếu cần) |

## 🔧 Advanced: Manual Refresh (Optional)

Nếu cần refresh token manually (rare case):

```javascript
// Access internal client
const client = waterbase._client;

// Manual refresh
const success = await client._handleTokenRefresh(false); // User token
const ownerSuccess = await client._handleTokenRefresh(true); // Owner token

if (success) {
    console.log('Token refreshed manually');
}
```

## 🐛 Troubleshooting

### Issue: "No refresh token available"

**Cause:** User chưa login hoặc đã logout

**Solution:**
```javascript
if (!waterbase.auth.isAuthenticated()) {
    await waterbase.auth.loginUser(email, password);
}
```

### Issue: "Token refresh failed"

**Cause:** Refresh token đã hết hạn (> 7 days) hoặc bị revoke

**Solution:**
```javascript
// SDK tự động clear tokens, chỉ cần redirect to login
window.location.href = '/login';
```

### Issue: Multiple refresh requests

**Cause:** Không phải bug! SDK tự động prevent concurrent refreshes

**Solution:** Không cần làm gì, SDK đã xử lý

## 📝 Migration từ SDK cũ

### Before (SDK v3.0)

```javascript
// Phải tự implement refresh logic
api.interceptors.response.use(
    response => response,
    async error => {
        if (error.response?.status === 401) {
            // Manual refresh
            const newToken = await refreshToken();
            // Retry request
            return api(originalRequest);
        }
    }
);
```

### After (SDK v3.1)

```javascript
// Không cần làm gì cả!
const waterbase = new Waterbase({ appId: 'xxx' });
await waterbase.auth.loginUser(email, password);

// Tất cả requests tự động refresh
await waterbase.db.collection('todos').get();
```

## 🎉 Kết luận

Waterbase SDK v3.1 giờ đây hoạt động **giống hệt Firebase**:
- ✅ Developer chỉ cần login một lần
- ✅ SDK tự động xử lý token expiration
- ✅ Không cần viết thêm code
- ✅ Transparent và reliable

**Enjoy coding! 🚀**

---

**Version:** 3.1.0  
**Updated:** 2025-12-10  
**Author:** Waterbase Team
