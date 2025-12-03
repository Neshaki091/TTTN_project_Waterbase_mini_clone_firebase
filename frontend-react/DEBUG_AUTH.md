# Hướng dẫn Debug Authentication Issue

## Vấn đề: "Missing or invalid authorization header"

Lỗi này xảy ra khi frontend gọi API nhưng không gửi kèm token hoặc token không đúng format.

## Cách kiểm tra

### 1. Mở Browser Console

Trong trang web (http://localhost:5173), nhấn `F12` để mở Developer Tools, chọn tab **Console**.

### 2. Chạy debug commands

```javascript
// Kiểm tra token có tồn tại không
debugAuth()

// Test API call với token hiện tại
testAuthenticatedCall()
```

### 3. Kiểm tra kết quả

**Nếu `debugAuth()` trả về:**
```javascript
{
  hasToken: false,
  token: null,
  ownerData: null
}
```

➡️ **Nguyên nhân**: Chưa đăng nhập hoặc token đã bị xóa.

**Giải pháp**: Đăng nhập lại.

---

**Nếu `debugAuth()` trả về:**
```javascript
{
  hasToken: true,
  token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  ownerData: { ... }
}
```

Nhưng `testAuthenticatedCall()` vẫn trả về lỗi 401:

➡️ **Nguyên nhân**: Token không hợp lệ hoặc đã hết hạn.

**Giải pháp**: 
1. Đăng xuất và đăng nhập lại
2. Hoặc xóa localStorage và đăng nhập lại:
```javascript
localStorage.clear()
window.location.reload()
```

---

## Kiểm tra thủ công

### Kiểm tra localStorage

Trong Console, chạy:
```javascript
localStorage.getItem('ownerToken')
localStorage.getItem('ownerData')
```

### Kiểm tra API request

Trong tab **Network** của Developer Tools:
1. Refresh trang hoặc thực hiện action gọi API
2. Click vào request đến `/apps/...`
3. Xem tab **Headers** → **Request Headers**
4. Kiểm tra có header `Authorization: Bearer <token>` không

**Nếu không có header Authorization**:
- Frontend không gửi token
- Kiểm tra lại `api.client.js` interceptor

**Nếu có header nhưng vẫn lỗi 401**:
- Token không hợp lệ
- Đăng nhập lại

---

## Các trường hợp thường gặp

### 1. Đăng nhập thành công nhưng redirect về login ngay

**Nguyên nhân**: Token không được lưu vào localStorage sau khi login.

**Kiểm tra**: Xem `auth.service.js` line 15-17:
```javascript
if (response.data.accessToken) {
  localStorage.setItem('ownerToken', response.data.accessToken);
  localStorage.setItem('ownerData', JSON.stringify(response.data.owner || response.data));
}
```

**Giải pháp**: Kiểm tra backend response có trả về `accessToken` không.

### 2. Token bị xóa sau khi refresh

**Nguyên nhân**: Browser settings hoặc incognito mode.

**Giải pháp**: 
- Không dùng incognito mode
- Kiểm tra browser settings cho phép localStorage

### 3. CORS error khi gọi API

**Nguyên nhân**: NGINX CORS config.

**Giải pháp**: Đã được fix trong nginx.conf, restart NGINX:
```bash
docker-compose restart nginx
```

---

## Test flow hoàn chỉnh

1. **Clear localStorage**:
```javascript
localStorage.clear()
```

2. **Refresh trang**: `F5`

3. **Đăng ký tài khoản mới**:
   - Click tab "Register"
   - Nhập: username, email, password
   - Click "Register"

4. **Kiểm tra localStorage**:
```javascript
debugAuth()
```

Kết quả mong đợi:
```javascript
{
  hasToken: true,
  token: "eyJ...",
  ownerData: { _id: "...", username: "...", email: "...", role: "owner" }
}
```

5. **Test API call**:
```javascript
testAuthenticatedCall()
```

Kết quả mong đợi:
```javascript
✅ Response status: 200
✅ Response data: []  // hoặc danh sách apps nếu đã tạo
```

---

## Nếu vẫn không được

### Kiểm tra backend

```bash
# Xem logs của app-service
docker logs app-services --tail=50

# Xem logs của auth-service
docker logs auth-services --tail=50
```

### Test trực tiếp backend

```powershell
# Test login
$body = '{"email":"test@test.com","password":"test123"}'
Invoke-WebRequest -Uri "http://localhost/auth/owners/login" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing

# Lưu token từ response
$token = "eyJ..."  # Copy từ response

# Test get apps
Invoke-WebRequest -Uri "http://localhost/apps/" -Method GET -Headers @{Authorization="Bearer $token"} -UseBasicParsing
```
