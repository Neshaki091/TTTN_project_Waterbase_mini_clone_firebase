# Waterbase SDK - Auth Service (Authentication Module)

## Mô tả
Module Authentication xử lý toàn bộ luồng xác thực cho 2 vai trò: **User** (người dùng cuối) và **Owner** (chủ ứng dụng/admin). Hỗ trợ đăng ký, đăng nhập, đăng xuất, và tự động quản lý token.

## Danh sách chức năng

### 1. User Authentication

#### `registerUser(userData)` — Đăng ký tài khoản User
- **Tham số**: `{ email, password, username? }` — `email` và `password` là bắt buộc.
- **Kết quả trả về**: Object chứa `accessToken`, `refreshToken`, và `user`.
- **Hành vi**: Tự động lưu token vào storage và set `currentUser`.
- **API Endpoint**: `POST /api/v1/auth/users`

```javascript
const result = await waterbase.auth.registerUser({
    email: 'user@example.com',
    password: 'securePass123',
    username: 'John Doe'
});
```

#### `loginUser(email, password)` — Đăng nhập User
- **Tham số**: `email` (string), `password` (string) — cả hai đều bắt buộc.
- **Kết quả trả về**: Object chứa `accessToken`, `refreshToken`, và `user`.
- **Hành vi**: Tự động lưu token vào storage và set `currentUser`.
- **API Endpoint**: `POST /api/v1/auth/users/login`

```javascript
const result = await waterbase.auth.loginUser('user@example.com', 'securePass123');
```

#### `logoutUser()` — Đăng xuất User
- **Tham số**: Không có.
- **Hành vi**: Gọi API logout, xóa token và user data khỏi storage. Nếu API logout thất bại, vẫn xóa local data.
- **API Endpoint**: `POST /api/v1/auth/users/logout`

```javascript
await waterbase.auth.logoutUser();
```

#### `getCurrentUser()` — Lấy thông tin User hiện tại
- **Trả về**: Object user hoặc `null` nếu chưa đăng nhập.
- **Lưu ý**: Đây là method đồng bộ, đọc từ bộ nhớ (không gọi API).

#### `isAuthenticated()` — Kiểm tra trạng thái đăng nhập
- **Trả về**: `boolean` — `true` nếu có token VÀ có `currentUser`.

---

### 2. Owner Authentication

#### `registerOwner(ownerData)` — Đăng ký tài khoản Owner
- **Tham số**: `{ email, password }` — cả hai đều bắt buộc.
- **Kết quả trả về**: Object chứa `accessToken`, `refreshToken`, và `owner`.
- **API Endpoint**: `POST /api/v1/auth/owners`

#### `loginOwner(email, password)` — Đăng nhập Owner
- **Tham số**: `email` (string), `password` (string).
- **Kết quả trả về**: Object chứa `accessToken`, `refreshToken`, và `owner`.
- **API Endpoint**: `POST /api/v1/auth/owners/login`

#### `logoutOwner()` — Đăng xuất Owner
- **API Endpoint**: `POST /api/v1/auth/owners/logout`
- **Lưu ý**: Sử dụng `ownerToken` thay vì `token` thông thường.

#### `getCurrentOwner()` — Lấy thông tin Owner hiện tại
- **Trả về**: Object owner hoặc `null`.

#### `isOwnerAuthenticated()` — Kiểm tra Owner đã đăng nhập chưa
- **Trả về**: `boolean`.

---

## Cơ chế Auto Token Refresh

SDK tự động xử lý khi token hết hạn (nhận HTTP 401):

1. Phát hiện response `401 Unauthorized`.
2. Gọi API `POST /api/v1/auth/users/refresh-token` (hoặc `owners/refresh-token` cho Owner).
3. Gửi `refreshToken` cũ trong body request.
4. Nhận về **cả** `accessToken` mới VÀ `refreshToken` mới (Token Rotation).
5. Lưu cả 2 token mới vào storage.
6. Retry request ban đầu với token mới.

**Chống concurrent refresh**: Nếu nhiều request cùng nhận 401, chỉ gọi refresh API 1 lần, các request khác chờ kết quả.

---

## Các lỗi thường gặp và cách xử lý

### 1. `ValidationError: Email and password are required`
- **Nguyên nhân**: Gọi `registerUser()`, `loginUser()`, `registerOwner()`, hoặc `loginOwner()` mà thiếu `email` hoặc `password`.
- **Cách xử lý**: Validate form trước khi gọi SDK. Đảm bảo cả `email` và `password` đều có giá trị.
```javascript
if (!email || !password) {
    showError('Vui lòng nhập đầy đủ email và mật khẩu');
    return;
}
```

### 2. `AuthError: Authentication failed` (HTTP 401)
- **Nguyên nhân**: Sai email/password khi đăng nhập, hoặc token đã hết hạn và refresh token cũng hết hạn.
- **Cách xử lý**:
  - Nếu đang đăng nhập: hiển thị thông báo "Sai email hoặc mật khẩu".
  - Nếu đang thao tác khác: chuyển hướng user về trang đăng nhập.
```javascript
try {
    await waterbase.auth.loginUser(email, password);
} catch (error) {
    if (error.statusCode === 401) {
        showError('Email hoặc mật khẩu không chính xác');
    }
}
```

### 3. `AuthError: Forbidden` (HTTP 403)
- **Nguyên nhân**: User không có quyền truy cập tài nguyên.
- **Cách xử lý**: Kiểm tra lại quyền của user trong rules hoặc thông báo lỗi phân quyền.

### 4. Token refresh thất bại
- **Nguyên nhân**: Refresh token đã hết hạn hoặc bị revoke (do Token Rotation, mỗi refresh token chỉ dùng được 1 lần).
- **Hậu quả**: SDK tự động xóa toàn bộ token và user data khỏi storage.
- **Cách xử lý**: Bắt user đăng nhập lại.
```javascript
if (!waterbase.auth.isAuthenticated()) {
    // Chuyển hướng về trang login
    navigate('/login');
}
```

### 5. `NetworkError: Request timeout`
- **Nguyên nhân**: Server không phản hồi trong thời gian `timeout` (mặc định 30 giây).
- **Cách xử lý**: Kiểm tra kết nối mạng, thử lại sau. SDK đã tự retry 3 lần trước khi throw error.

### 6. `NetworkError: Network request failed`
- **Nguyên nhân**: Không có kết nối internet hoặc server không hoạt động.
- **Cách xử lý**: Hiển thị thông báo kiểm tra kết nối mạng.

### 7. Lỗi khi đăng ký email đã tồn tại
- **Nguyên nhân**: Email đã được sử dụng bởi tài khoản khác.
- **Response**: HTTP 400/409 với message tương ứng.
- **Cách xử lý**: Thông báo "Email đã được sử dụng, vui lòng dùng email khác".

### 8. Mất dữ liệu `currentUser` sau reload trang
- **Nguyên nhân**: `_initializeAuth()` chạy bất đồng bộ, data có thể chưa load xong khi kiểm tra.
- **Cách xử lý**: Đợi SDK khởi tạo xong trước khi kiểm tra auth state, hoặc dùng `await` cho các thao tác cần auth.
