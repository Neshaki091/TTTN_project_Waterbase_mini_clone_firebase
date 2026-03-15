# Waterbase SDK v3.0 - Tổng Quan

## Mô tả
Waterbase SDK là bộ công cụ JavaScript client-side (tương tự Firebase SDK) cho phép ứng dụng Web và React Native kết nối đến Waterbase Backend. SDK cung cấp 6 module chính: Authentication, Database (WaterDB), Realtime Database (RTWaterDB), Realtime Events, Storage, và Rules.

## Khởi tạo SDK

```javascript
import Waterbase from 'waterbase-sdk';

const waterbase = new Waterbase({
    apiUrl: 'https://api.waterbase.click',  // URL Backend
    appId: 'YOUR_APP_ID',                   // Bắt buộc
    apiKey: 'YOUR_API_KEY',                 // Tùy chọn
    timeout: 30000,                         // Timeout request (ms)
    retryAttempts: 3,                       // Số lần retry khi lỗi
    retryDelay: 1000,                       // Delay giữa các retry (ms)
    debug: false                            // Bật/tắt debug log
});
```

### Tự động load config từ file
- Nếu không truyền `appId`, SDK sẽ tự tìm file `waterbase-service.json` trong thư mục gốc dự án.
- Cấu trúc file `waterbase-service.json`:
```json
{
    "apiUrl": "https://api.waterbase.click",
    "appId": "your-app-id",
    "apiKey": "your-api-key"
}
```

## Các Module có sẵn

| Module | Truy cập qua | Mô tả |
|--------|-------------|--------|
| Authentication | `waterbase.auth` | Đăng ký, đăng nhập, đăng xuất (User & Owner) |
| WaterDB | `waterbase.db` | CSDL Document-based, hỗ trợ query (tương tự Firestore) |
| RTWaterDB | `waterbase.rtdb` | CSDL Realtime tốc độ cao (tương tự Realtime Database) |
| Storage | `waterbase.storage` | Upload, download, quản lý file |
| Realtime Events | `waterbase.realtime` | WebSocket subscription cho collection changes |
| Rules | `waterbase.rules` | Quản lý quyền truy cập (permission rules) |

## Hệ thống Error Classes

SDK sử dụng hệ thống lỗi phân cấp rõ ràng:

| Error Class | Code | StatusCode mặc định | Mô tả |
|------------|------|---------------------|--------|
| `WaterbaseError` | - | - | Base error class |
| `AuthError` | `AUTH_ERROR` | 401 | Lỗi xác thực (sai mật khẩu, token hết hạn) |
| `NetworkError` | `NETWORK_ERROR` | 0 | Lỗi mạng (timeout, mất kết nối) |
| `ValidationError` | `VALIDATION_ERROR` | 400 | Lỗi validate dữ liệu đầu vào |
| `DatabaseError` | `DATABASE_ERROR` | 500 | Lỗi thao tác CSDL |
| `StorageError` | `STORAGE_ERROR` | 500 | Lỗi thao tác file storage |

### Sử dụng Error Handling
```javascript
import { AuthError, NetworkError, ValidationError } from 'waterbase-sdk';

try {
    await waterbase.auth.loginUser(email, password);
} catch (error) {
    if (error instanceof AuthError) {
        // Lỗi xác thực - sai email/password, token hết hạn
    } else if (error instanceof NetworkError) {
        // Lỗi mạng - timeout, không có internet
    } else if (error instanceof ValidationError) {
        // Lỗi validate - thiếu trường bắt buộc
    }
}
```

## Cơ chế Core quan trọng

### Auto Retry
- HTTP Client tự động retry request khi gặp lỗi (mặc định 3 lần).
- Delay giữa các retry tăng dần: `retryDelay * (retryCount + 1)`.
- **Không retry** khi gặp `AuthError` (401/403).

### Auto Token Refresh
- Khi nhận response `401 Unauthorized`, SDK tự động gọi refresh token.
- Sử dụng **Token Rotation**: cả access token và refresh token đều được thay mới sau mỗi lần refresh.
- Có cơ chế chống **concurrent refresh** (chỉ gọi refresh 1 lần dù nhiều request bị 401 cùng lúc).
- Nếu refresh thất bại → xóa toàn bộ token và user data khỏi storage.

### Cross-Platform Storage
- **Web**: sử dụng `localStorage`.
- **React Native**: sử dụng `@react-native-async-storage/async-storage`.
- **SSR/Node.js**: sử dụng in-memory storage (fallback).

## Các lỗi thường gặp khi khởi tạo

| Lỗi | Nguyên nhân | Cách xử lý |
|-----|------------|------------|
| `ValidationError: appId is required` | Không truyền `appId` và không có file `waterbase-service.json` | Truyền `appId` hoặc tạo file `waterbase-service.json` |
| CORS error khi gọi API | Sử dụng `http://` thay vì `https://` | Đổi `apiUrl` sang `https://api.waterbase.click` |
| Request timeout liên tục | Server không phản hồi hoặc `timeout` quá nhỏ | Tăng giá trị `timeout` hoặc kiểm tra server |
