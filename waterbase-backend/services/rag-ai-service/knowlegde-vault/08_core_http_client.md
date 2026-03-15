# Waterbase SDK - HTTP Client & Error Handling (Core Module)

## Mô tả
Module Core bao gồm HTTP Client (xử lý tất cả API requests), hệ thống Error Classes, và Storage Adapter (cross-platform storage). Đây là tầng nền tảng mà tất cả các module khác dựa vào.

## HTTP Client — Cơ chế hoạt động

### Request Flow

```
SDK Method gọi → HttpClient.request()
    │
    ├─ Tạo headers (appId, token, content-type)
    ├─ Thêm timeout (AbortController)
    ├─ Gửi fetch()
    │
    ├─ Response OK (200-299) → Parse JSON → Trả về data
    │
    ├─ Response 401 → Auto Refresh Token
    │       ├─ Refresh OK → Retry request
    │       └─ Refresh Fail → Throw AuthError
    │
    ├─ Response 403 → Throw AuthError("Forbidden")
    │
    ├─ Response khác → Throw Error(message)
    │
    └─ Network Error:
            ├─ Timeout → Throw NetworkError("Request timeout")
            ├─ Retry < maxRetry → Chờ rồi retry
            └─ Retry >= maxRetry → Throw NetworkError
```

### Config mặc định

| Config | Giá trị mặc định | Mô tả |
|--------|------------------|--------|
| `timeout` | 30000 ms | Thời gian chờ tối đa cho 1 request |
| `retryAttempts` | 3 | Số lần retry khi gặp lỗi mạng |
| `retryDelay` | 1000 ms | Delay giữa các retry (nhân với số lần retry) |

### Headers tự động gắn

| Header | Giá trị | Luôn gắn? |
|--------|---------|-----------|
| `x-app-id` | `config.appId` | ✅ Luôn luôn |
| `Content-Type` | `application/json` | ✅ Mặc định (bỏ khi upload file) |
| `Authorization` | `Bearer {token}` | Khi có token |
| `x-api-key` | `config.apiKey` | Khi không có token nhưng có apiKey |

### HTTP Methods có sẵn

| Method | Tham số | Mô tả |
|--------|---------|--------|
| `get(url, options?)` | URL | GET request |
| `post(url, body, options?)` | URL, body | POST request |
| `put(url, body, options?)` | URL, body | PUT request |
| `patch(url, body, options?)` | URL, body | PATCH request |
| `delete(url, options?)` | URL | DELETE request |

---

## Auto Token Refresh — Chi tiết kỹ thuật

### Quy trình
1. Request nhận HTTP `401 Unauthorized`.
2. Kiểm tra có `refreshToken` không → Nếu không có, throw `AuthError`.
3. Kiểm tra có đang refresh không (chống concurrent) → Nếu có, chờ kết quả.
4. Gọi API refresh:
   - User: `POST /api/v1/auth/users/refresh-token`
   - Owner: `POST /api/v1/auth/owners/refresh-token`
5. Nhận về `accessToken` mới VÀ `refreshToken` mới (Token Rotation).
6. Lưu cả 2 token vào storage.
7. Retry request ban đầu với token mới.

### Token Rotation
- Mỗi lần refresh, cả `accessToken` và `refreshToken` đều được thay mới.
- Refresh token cũ **không thể dùng lại** (bị revoke).
- Nếu 2 tab/device cùng dùng chung refresh token, chỉ 1 cái thành công, cái còn lại phải đăng nhập lại.

### Khi Refresh thất bại
- Xóa toàn bộ: `token`, `refreshToken`, `currentUser` (hoặc `ownerToken`, `ownerRefreshToken`, `currentOwner`).
- Xóa khỏi Storage.
- Trả về `false` → Request ban đầu throw `AuthError`.

---

## Storage Adapter — Cross-Platform

### Tự động phát hiện môi trường

| Môi trường | Storage Backend | Yêu cầu |
|-----------|----------------|----------|
| Web (Browser) | `localStorage` | Không cần cài thêm |
| React Native | `AsyncStorage` | Cần cài `@react-native-async-storage/async-storage` |
| SSR / Node.js | In-memory storage | Tự động fallback, data mất khi restart |

### Storage Keys sử dụng

| Key | Mô tả |
|-----|--------|
| `waterbase_token` | User access token |
| `waterbase_refresh_token` | User refresh token |
| `waterbase_user` | User data (JSON string) |
| `waterbase_owner_token` | Owner access token |
| `waterbase_owner_refresh_token` | Owner refresh token |
| `waterbase_owner` | Owner data (JSON string) |

---

## Các lỗi thường gặp toàn hệ thống

### 1. `NetworkError: Request timeout`
- **Nguyên nhân**: Server không phản hồi trong `timeout` ms.
- **Chi tiết**: Sử dụng `AbortController` để cancel request.
- **Cách xử lý**:
  - Tăng `timeout` trong config.
  - Kiểm tra server hoạt động.
  - Kiểm tra kết nối mạng.

### 2. `NetworkError: Network request failed`
- **Nguyên nhân**: Fetch thất bại hoàn toàn (không có internet, DNS fail, SSL error).
- **Đã retry**: 3 lần (mặc định) trước khi throw.
- **Cách xử lý**: Hiển thị thông báo "Kiểm tra kết nối mạng".

### 3. `AuthError: Authentication failed` (401)
- **Nguyên nhân**: Token hết hạn VÀ refresh token cũng hết hạn.
- **Cách xử lý**: Chuyển user về trang đăng nhập.

### 4. `AuthError: Forbidden` (403)
- **Nguyên nhân**: User không có quyền truy cập resource.
- **Cách xử lý**: Kiểm tra rules, hoặc thông báo "Bạn không có quyền".

### 5. Retry vô hạn (potential)
- **Nguyên nhân**: Lỗi non-network nhưng message chứa 'fetch'.
- **Cách xử lý**: SDK đã giới hạn retry = `retryAttempts`. Không xảy ra retry vô hạn.

### 6. Race condition khi refresh token
- **Nguyên nhân**: Nhiều request 401 cùng lúc cố refresh.
- **Cách xử lý**: SDK sử dụng biến `isRefreshing` và `refreshPromise` để chống concurrent refresh.

### 7. FormData upload không gửi được
- **Nguyên nhân**: `Content-Type` header được set sai khi gửi FormData.
- **Cách xử lý**: SDK tự động xóa `Content-Type` khi body là `FormData` (để browser tự thêm boundary).

### 8. Synchronous storage access trên React Native
- **Nguyên nhân**: Gọi `getItemSync()`, `setItemSync()`, `removeItemSync()` trên React Native.
- **Error**: `Synchronous storage access not supported in React Native`.
- **Cách xử lý**: Luôn sử dụng async methods: `getItem()`, `setItem()`, `removeItem()`.

### 9. AsyncStorage chưa cài trên React Native
- **Warning**: `AsyncStorage not found. Please install @react-native-async-storage/async-storage`.
- **Hậu quả**: SDK fallback sang in-memory storage (data mất khi close app).
- **Cách xử lý**: Cài package: `npm install @react-native-async-storage/async-storage`.
