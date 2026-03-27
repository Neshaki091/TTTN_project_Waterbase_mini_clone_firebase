# Auth Example 1: User Registration
```javascript
import Waterbase from 'waterbase-sdk';
// Khởi tạo SDK với appId (hoặc lấy từ waterbase-service.json)
const waterbase = new Waterbase({ 
  appId: 'my-app-id',
  apiUrl: 'https://api.waterbase.click' 
});

async function signup(email, password, username) {
  try {
    // registerUser nhận một object duy nhất
    const res = await waterbase.auth.registerUser({ email, password, username });
    console.log('User registered:', res.user); 
    return res;
  } catch (error) {
    console.error('Signup failed:', error.message);
  }
}
```
# Auth Example 2: User Login
```javascript
async function login(email, password) {
  try {
    // loginUser nhận 2 tham số rời: email và password
    const res = await waterbase.auth.loginUser(email, password);
    if (waterbase.auth.isAuthenticated()) {
      const user = waterbase.auth.getCurrentUser();
      console.log('Welcome back:', user.username || user.email);
    }
  } catch (error) {
    console.error('Login error:', error.message);
  }
}
```
# Auth Example 3: User Logout
```javascript
async function handleLogout() {
  await waterbase.auth.logoutUser();
  console.log('Logged out, tokens cleared from storage');
}
```
# Auth Example 4: Checking Session
```javascript
function checkAuth() {
  // isAuthenticated() kiểm tra cả token và dữ liệu user hiện tại
  if (waterbase.auth.isAuthenticated()) {
    const user = waterbase.auth.getCurrentUser();
    return `Logged in as ${user.email}`;
  }
  return 'Not logged in';
}
```
# Auth Example 5: Admin/Owner Login
```javascript
async function adminLogin(email, password) {
  // loginOwner dùng cho chủ ứng dụng để quản lý Rules/Dữ liệu hệ thống
  const res = await waterbase.auth.loginOwner(email, password);
  if (waterbase.auth.isOwnerAuthenticated()) {
     console.log('Admin session active:', waterbase.auth.getCurrentOwner().email);
  }
}
```
# Auth Example 6: Owner Registration
```javascript
async function createOwner(email, password) {
  // Đăng ký tài khoản Owner mới
  return await waterbase.auth.registerOwner({ email, password });
}
```
