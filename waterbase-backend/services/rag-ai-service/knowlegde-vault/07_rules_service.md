# Waterbase SDK - Rules Service (Hệ thống phân quyền)

## Mô tả
Module Rules quản lý **quyền truy cập (permission)** cho ứng dụng Waterbase. Mỗi rule định nghĩa danh sách **actions** (hành động) được phép cho một **role** (vai trò) cụ thể trong một **app** cụ thể. Backend sử dụng **MongoDB** để lưu trữ rules.

## Kiến trúc hệ thống

```
SDK (Client)                     Rule Service (Backend - Port 3004)
    │                                    │
    ├─ getRules(role) ──────► GET  /:appId/:role
    ├─ updateRules(role, rules) ► PUT  /
    │                                    │
    │                            ┌───────┼───────────┐
    │                            │  MongoDB           │
    │                            │  waterbase_rule DB  │
    │                            │  Collection: rules  │
    │                            └────────────────────┘
    │
    │  (Internal - Service-to-Service)
    │  POST /internal/rules  ← Không cần auth
```

---

## Cấu trúc Rule trong Database

```javascript
{
    appId: "app_123",           // ID ứng dụng (bắt buộc, có index)
    ownerId: "owner_456",       // ID người tạo rule (bắt buộc)
    role: "user",               // Vai trò: "owner", "user", "admin", v.v. (bắt buộc)
    actions: [                  // Danh sách hành động được phép
        "read_users",
        "create_users",
        "read_todos",
        "update_todos"
    ],
    conditions: {},             // Điều kiện bổ sung (Mixed type, mặc định {})
    updatedBy: "owner_456",     // ID người cập nhật cuối cùng
    createdAt: "2026-03-09...", // Tự động (timestamps)
    updatedAt: "2026-03-09..."  // Tự động (timestamps)
}
```

**Unique Constraint**: Mỗi tổ hợp `(appId, role)` chỉ có **duy nhất 1 rule**. Không thể tạo 2 rule cho cùng app và role.

---

## Hệ thống Action Matching

Khi kiểm tra quyền, hệ thống hỗ trợ 3 cách khớp action:

### 1. Exact Match — Khớp chính xác
```javascript
actions: ["read_users", "create_users"]
// "read_users" → ✅ Cho phép
// "delete_users" → ❌ Từ chối
```

### 2. Full Wildcard `*` — Tất cả quyền
```javascript
actions: ["*"]
// Bất kỳ action nào → ✅ Cho phép (admin toàn quyền)
```

### 3. Pattern Matching `prefix_*` — Khớp theo prefix
```javascript
actions: ["read_*", "create_todos"]
// "read_users" → ✅ Cho phép (khớp read_*)
// "read_todos" → ✅ Cho phép (khớp read_*)
// "create_todos" → ✅ Cho phép (exact match)
// "delete_users" → ❌ Từ chối
```

### Đặc biệt: Role `owner` luôn được phép
Nếu `role === 'owner'`, hệ thống **tự động cho phép** mọi action mà không cần kiểm tra rule.

---

## Danh sách chức năng SDK

### 1. `getRules(role)` — Lấy rules theo role

- **Tham số**: `role` (string) — tên vai trò (ví dụ: `'user'`, `'admin'`).
- **API Endpoint**: `GET /:appId/:role`
- **Yêu cầu auth**: Token của `waterbaseAdmin` hoặc `owner`.
- **Trả về**: Object rule bao gồm `actions`, `conditions`, `ownerId`, timestamps.

```javascript
try {
    const rules = await waterbase.rules.getRules('user');
    console.log('Các hành động được phép:', rules.actions);
    // Kết quả: ["read_users", "create_todos", "read_todos", "update_todos"]
} catch (error) {
    console.error('Lỗi lấy rules:', error.message);
}
```

### 2. `updateRules(role, rules)` — Cập nhật rules

- **Tham số**:
  - `role` (string) — tên vai trò.
  - `rules` (object) — bộ rules mới, phải chứa trường `actions`.
- **API Endpoint**: `PUT /`
- **Yêu cầu auth**: Token của `waterbaseAdmin` hoặc `owner`.
- **Phân quyền**: Owner chỉ có thể update rule thuộc về mình (kiểm tra `ownerId`).

```javascript
try {
    await waterbase.rules.updateRules('user', {
        appId: 'app_123',
        role: 'user',
        actions: [
            'read_users',
            'create_todos',
            'read_todos',
            'update_todos',
            'delete_todos'
        ]
    });
    console.log('Cập nhật rules thành công');
} catch (error) {
    console.error('Lỗi cập nhật rules:', error.message);
}
```

---

## API Endpoints đầy đủ (Backend)

| Method | Endpoint | Quyền yêu cầu | Mô tả |
|--------|----------|----------------|--------|
| `GET /` | Tất cả rules | `waterbaseAdmin` | Lấy toàn bộ rules (admin) hoặc rules của owner |
| `GET /:appId/:role` | Rule cụ thể | `waterbaseAdmin`, `owner` | Lấy rule cho 1 role trong 1 app |
| `POST /` | Tạo rule | `waterbaseAdmin`, `owner` | Tạo rule mới |
| `PUT /` | Cập nhật rule | `waterbaseAdmin`, `owner` | Cập nhật actions của rule |
| `DELETE /:appId/:role` | Xóa rule | `waterbaseAdmin`, `owner` | Xóa rule |
| `POST /check-action` | Kiểm tra quyền | `waterbaseAdmin`, `owner`, `user` | Kiểm tra 1 action có được phép không |
| `POST /internal/rules` | Tạo rule (internal) | **Không cần auth** | Service-to-service, tạo rule khi app mới được tạo |

---

## Cấu hình Backend

### Biến môi trường (.env)

```env
PORT=3004                                    # Port chạy service
MONGO_URI=mongodb://mongodb:27017/waterbase_rule  # MongoDB connection string
JWT_SECRET=your_jwt_secret                   # Secret để verify JWT token
INTERNAL_SECRET=your_internal_secret         # Secret cho service-to-service communication
```

### Cơ chế xác thực (Auth Middleware)

Backend hỗ trợ 2 cách xác thực:

#### 1. JWT Token (cho Client SDK)
```
Header: Authorization: Bearer <jwt_token>
```
- Token được decode bằng `JWT_SECRET`.
- Từ token, lấy ra `req.user.id` và `req.user.role`.
- Kiểm tra `role` có nằm trong danh sách cho phép không.

#### 2. Internal Secret (cho Service-to-Service)
```
Header: x-internal-secret: <internal_secret>
```
- Dùng khi các microservice nội bộ gọi nhau (ví dụ: khi tạo app mới, auth-service gọi rule-service để tạo rule mặc định).
- Request được coi là `waterbaseAdmin` với `id: 'SYSTEM'`.

---

## Hướng dẫn cấu hình Rules cho ứng dụng

### Bước 1: Xác định các Role trong ứng dụng
Xác định các vai trò người dùng, ví dụ:
- `owner`: Chủ ứng dụng (toàn quyền, tự động cho phép).
- `admin`: Quản trị viên (gần như toàn quyền).
- `user`: Người dùng thông thường (quyền hạn chế).
- `guest`: Khách (chỉ đọc).

### Bước 2: Liệt kê các Actions
Đặt tên action theo format `<hành_động>_<tài_nguyên>`:
```
read_users, create_users, update_users, delete_users
read_todos, create_todos, update_todos, delete_todos
read_messages, create_messages
upload_files, delete_files
```

### Bước 3: Tạo Rules cho mỗi Role

```javascript
// Rule cho admin — dùng wildcard cho toàn quyền
await waterbase.rules.updateRules('admin', {
    appId: 'app_123',
    role: 'admin',
    actions: ['*']  // Toàn quyền
});

// Rule cho user — quyền cụ thể
await waterbase.rules.updateRules('user', {
    appId: 'app_123',
    role: 'user',
    actions: [
        'read_users',         // Đọc thông tin user
        'read_*',             // Đọc tất cả tài nguyên (pattern match)
        'create_todos',       // Tạo todo
        'update_todos',       // Cập nhật todo
        'upload_files'        // Upload file
    ]
});

// Rule cho guest — chỉ đọc
await waterbase.rules.updateRules('guest', {
    appId: 'app_123',
    role: 'guest',
    actions: ['read_*']  // Chỉ đọc tất cả
});
```

### Bước 4: Kiểm tra quyền trong ứng dụng
Các service khác (WaterDB, Storage, v.v.) sẽ gọi `POST /check-action` để kiểm tra quyền trước khi cho phép thao tác:
```javascript
// Request body
{
    "appId": "app_123",
    "role": "user",
    "action": "create_todos"
}

// Response:
// 204 No Content → Cho phép
// 403 Forbidden  → Từ chối (kèm danh sách actions được phép)
```

---

## Các lỗi thường gặp và cách xử lý

### 1. `401 - Missing token`
- **Nguyên nhân**: Request không có header `Authorization: Bearer <token>`.
- **Cách xử lý**: Đảm bảo đã đăng nhập trước khi gọi Rules API.
```javascript
// ❌ Sai — chưa đăng nhập
await waterbase.rules.getRules('user');

// ✅ Đúng — đăng nhập trước
await waterbase.auth.loginOwner(email, password);
await waterbase.rules.getRules('user');
```

### 2. `401 - Invalid token`
- **Nguyên nhân**: JWT token hết hạn, bị sai, hoặc `JWT_SECRET` không khớp giữa các service.
- **Chi tiết**: Backend verify token bằng `jwt.verify(token, process.env.JWT_SECRET)`.
- **Cách xửlý**:
  - SDK tự động refresh token khi gặp 401 (nếu có refresh token).
  - Nếu refresh cũng thất bại → đăng nhập lại.
  - **Backend**: Kiểm tra `JWT_SECRET` trong `.env` khớp với auth-service.

### 3. `403 - Forbidden: insufficient role`
- **Nguyên nhân**: User có token hợp lệ nhưng role không đủ quyền gọi endpoint.
- **Chi tiết**: Endpoint `GET /` chỉ cho `waterbaseAdmin`. Endpoint khác cho `waterbaseAdmin` và `owner`.
- **Cách xử lý**:
  - Sử dụng `loginOwner()` thay vì `loginUser()` để có role `owner`.
  - User thông thường **không thể** quản lý rules trực tiếp.

### 4. `403 - Cannot view/update/delete rule of another owner`
- **Nguyên nhân**: Owner A cố truy cập/sửa/xóa rule thuộc về Owner B.
- **Cách xử lý**: Mỗi owner chỉ quản lý rules của app mình. Kiểm tra `appId` đúng.

### 5. `404 - Rule not found`
- **Nguyên nhân**: Không tồn tại rule cho tổ hợp `(appId, role)` được yêu cầu.
- **Cách xử lý**:
  - Kiểm tra `appId` và `role` đúng chính tả (phân biệt hoa/thường).
  - Tạo rule trước nếu chưa có.
```javascript
try {
    const rules = await waterbase.rules.getRules('user');
} catch (error) {
    if (error.message.includes('404') || error.message.includes('not found')) {
        console.log('Chưa có rule, cần tạo mới');
        // Tạo rule mặc định cho role 'user'
    }
}
```

### 6. `400 - Missing required fields`
- **Nguyên nhân**: Thiếu `appId`, `role`, hoặc `actions` khi tạo/cập nhật rule.
- **Cách xử lý**: Đảm bảo truyền đầy đủ các trường bắt buộc:
```javascript
// ❌ Sai — thiếu actions
await waterbase.rules.updateRules('user', {
    appId: 'app_123',
    role: 'user'
});

// ✅ Đúng — đầy đủ
await waterbase.rules.updateRules('user', {
    appId: 'app_123',
    role: 'user',
    actions: ['read_users', 'create_todos']
});
```

### 7. `400 - Rule already exists for this app and role`
- **Nguyên nhân**: Cố tạo rule mới (POST) cho tổ hợp `(appId, role)` đã tồn tại.
- **Cách xửlý**: Sử dụng `updateRules()` (PUT) thay vì tạo mới.

### 8. `403 - No rule found for role` (từ check-action)
- **Nguyên nhân**: Khi service khác gọi kiểm tra quyền, nhưng chưa có rule nào cho role đó.
- **Hậu quả**: Tất cả thao tác của role đó bị **từ chối mặc định** (deny by default).
- **Cách xử lý**: Tạo rule cho role đó với danh sách actions phù hợp.

### 9. `403 - Action forbidden` (từ check-action)
- **Nguyên nhân**: Rule tồn tại nhưng action cụ thể không nằm trong danh sách `actions`.
- **Response body** chứa `allowedActions` — danh sách actions hiện tại.
- **Cách xử lý**: Thêm action cần thiết vào rule:
```javascript
// Kiểm tra allowedActions để biết user có quyền gì
// Sau đó cập nhật nếu cần:
await waterbase.rules.updateRules('user', {
    appId: 'app_123',
    role: 'user',
    actions: [...currentActions, 'new_action_needed']
});
```

### 10. `500 - MongoDB connection error`
- **Nguyên nhân**: Không kết nối được MongoDB.
- **Cách xử lý (Backend)**:
  - Kiểm tra `MONGO_URI` trong `.env` đúng.
  - Kiểm tra MongoDB instance đang chạy.
  - Trong Docker: sử dụng hostname `mongodb` (tên container), không phải `localhost`.
```env
# Docker Compose
MONGO_URI=mongodb://mongodb:27017/waterbase_rule

# Local development
MONGO_URI=mongodb://localhost:27017/waterbase_rule
```

### 11. `500 - Duplicate key error` (MongoDB E11000)
- **Nguyên nhân**: Cố insert 2 records cùng `(appId, role)` do race condition hoặc lỗi logic.
- **Cách xử lý**: Backend nên kiểm tra `existing` trước khi tạo (đã có logic này). Nếu vẫn xảy ra, sử dụng `upsert` thay vì `insert`.

### 12. `INTERNAL_SECRET` không được cấu hình
- **Nguyên nhân**: Biến `INTERNAL_SECRET` không có trong `.env`, khiến service-to-service auth bypass bị disabled.
- **Hậu quả**: Các internal request không thể sử dụng `x-internal-secret` header, phải dùng JWT.
- **Cách xử lý**: Thêm `INTERNAL_SECRET` vào `.env` và đảm bảo giá trị khớp giữa tất cả services.
```env
INTERNAL_SECRET=a_very_long_random_secret_key_123
```

### 13. SDK gửi sai format — `updateRules()` không hoạt động
- **Nguyên nhân**: SDK `updateRules(role, rules)` gửi `{ rules: {...} }` nhưng backend expects `{ appId, role, actions }` ở body root.
- **Chi tiết SDK**:
```javascript
// SDK gửi: PUT / với body { rules: { actions: [...] } }
// Backend mong đợi: PUT / với body { appId, role, actions }
```
- **Cách xử lý**: Kiểm tra format request body phù hợp với backend. Nếu cần, truyền data trực tiếp thay vì wrap trong `rules`:
```javascript
// Có thể cần gọi trực tiếp API thay vì qua SDK
await waterbase._client.put('/api/v1/rules', {
    appId: 'app_123',
    role: 'user',
    actions: ['read_users', 'create_todos']
});
```

---

## Danh sách Action phổ biến

| Action | Mô tả |
|--------|--------|
| `*` | Toàn quyền (wildcard) |
| `read_*` | Đọc tất cả tài nguyên |
| `create_*` | Tạo tất cả tài nguyên |
| `read_users` | Đọc danh sách/thông tin user |
| `create_users` | Đăng ký user mới |
| `update_users` | Cập nhật thông tin user |
| `delete_users` | Xóa user |
| `read_{collection}` | Đọc collection cụ thể |
| `create_{collection}` | Thêm document vào collection |
| `update_{collection}` | Cập nhật document |
| `delete_{collection}` | Xóa document |
| `upload_files` | Upload file lên storage |
| `delete_files` | Xóa file từ storage |
