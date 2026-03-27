# Waterbase SDK - Authentication Service (Auth Module)

## Mô tả
Module Auth quản lý việc đăng ký, đăng nhập và phiên làm việc của người dùng (`Users`) và chủ sở hữu ứng dụng (`Owners`).

## Khởi tạo
```javascript
import Waterbase from 'waterbase-sdk';
const waterbase = new Waterbase({
    appId: 'your-app-id',
    apiKey: 'your-api-key'
});
```
*Lưu ý: Không dùng `waterbase.init()`, hãy dùng `new Waterbase()`.*

## Chức năng dành cho End-User

### 1. `registerUser(userData)`
- **Tham số**: `userData` (Object) chứa `email`, `password`, `username` (optional).
- **Trả về**: Promise chứa thông tin user và tokens.

### 2. `loginUser(email, password)`
- **Tham số**: `email`, `password`.
- **Trả về**: Promise. Lưu token vào storage tự động.

### 3. `logoutUser()`
- **Hành vi**: Xóa token và thông tin user khỏi bộ nhớ.

### 4. `getCurrentUser()`
- **Trả về**: Object user hiện tại hoặc `null`.

### 5. `isAuthenticated()`
- **Trả về**: `boolean`.

## Chức năng dành cho Owner (Admin)

### 1. `registerOwner(ownerData)`
- Dùng cho trang quản trị để tạo tài khoản Owner.

### 2. `loginOwner(email, password)`
- Đăng nhập quyền Owner để quản lý app/rules.

### 3. `logoutOwner()`

### 4. `getCurrentOwner()`

### 5. `isOwnerAuthenticated()`

## Lưu ý Quan trọng
- SDK tự động quản lý việc lưu trữ Token trong `localStorage` (Web) hoặc `AsyncStorage` (React Native).
- User Token và Owner Token là tách biệt hoàn toàn.
- Nếu Token hết hạn, API sẽ trả về lỗi `401 Unauthorized`.
