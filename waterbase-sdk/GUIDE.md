# Hướng Dẫn Sử Dụng Waterbase SDK (JavaScript/React)

Waterbase SDK cung cấp bộ công cụ toàn diện để xây dựng ứng dụng realtime, quản lý người dùng, cơ sở dữ liệu và lưu trữ file một cách dễ dàng.

## 1. Cài Đặt

Cài đặt SDK thông qua npm:

```bash
npm install waterbase-sdk
```

## 2. Khởi Tạo

Khởi tạo SDK trong ứng dụng của bạn (ví dụ: `src/App.jsx` hoặc `src/config/waterbase.js`).

```javascript
import Waterbase from 'waterbase-sdk';

const waterbase = new Waterbase({
    apiUrl: 'https://api.waterbase.click', // URL của Backend
    appId: 'YOUR_APP_ID',                  // Lấy từ trang quản trị
    apiKey: 'YOUR_API_KEY',                // Lấy từ trang quản trị
    debug: true                            // Bật log để debug (optional)
});

export default waterbase;
```

> **Lưu ý**: Nếu bạn dùng `https://api.waterbase.click`, hãy đảm bảo sử dụng `https://` để tránh lỗi CORS do chuyển hướng.

## 3. Xác Thực (Authentication)

Quản lý đăng ký, đăng nhập và thông tin người dùng.

### Đăng Ký
```javascript
try {
    const result = await waterbase.auth.registerUser({
        email: 'user@example.com',
        password: 'password123',
        username: 'User Name' // Optional
    });
    console.log('Đăng ký thành công:', result.user);
} catch (error) {
    console.error('Lỗi đăng ký:', error.message);
}
```

### Đăng Nhập
```javascript
try {
    const result = await waterbase.auth.loginUser('user@example.com', 'password123');
    console.log('Đăng nhập thành công:', result.user);
    // Token được tự động lưu trữ và sử dụng cho các request sau
} catch (error) {
    console.error('Lỗi đăng nhập:', error.message);
}
```

### Đăng Xuất
```javascript
waterbase.auth.logoutUser();
```

### Lấy User Hiện Tại
```javascript
const currentUser = waterbase.auth.getCurrentUser();
if (currentUser) {
    console.log('User đang đăng nhập:', currentUser);
} else {
    console.log('Chưa đăng nhập');
}
```

## 4. Realtime Database (RTWaterDB)

Cơ sở dữ liệu thời gian thực, thích hợp cho chat, thông báo, trạng thái online.

### Thêm Dữ Liệu
```javascript
try {
    await waterbase.rtdb.collection('messages').add({
        text: 'Hello World',
        userId: 'user_123',
        createdAt: new Date().toISOString()
    });
} catch (error) {
    console.error('Lỗi thêm tin nhắn:', error);
}
```

### Lấy Dữ Liệu (Một lần)
```javascript
try {
    const response = await waterbase.rtdb.collection('messages').get();
    // Dữ liệu trả về có thể cần được làm phẳng (flatten) nếu có cấu trúc lồng nhau
    const messages = (response.documents || []).map(doc => ({
        ...doc,
        ...(doc.data || {})
    }));
    console.log('Danh sách tin nhắn:', messages);
} catch (error) {
    console.error('Lỗi lấy tin nhắn:', error);
}
```

### Lắng Nghe Realtime (Subscribe)
```javascript
// Subscribe để nhận thông báo khi có dữ liệu mới, cập nhật hoặc xóa
const unsubscribe = waterbase.realtime.subscribe('messages', (event) => {
    if (event.type === 'created') {
        console.log('Tin nhắn mới:', event.data);
    } else if (event.type === 'updated') {
        console.log('Tin nhắn cập nhật:', event.data);
    } else if (event.type === 'deleted') {
        console.log('Tin nhắn bị xóa:', event.data);
    }
});

// Hủy đăng ký khi không cần thiết (ví dụ: khi component unmount)
// unsubscribe();
```

## 5. WaterDB (Persistent Database)

Cơ sở dữ liệu lưu trữ bền vững, thích hợp cho dữ liệu người dùng, cấu hình, bài viết.

### CRUD Cơ Bản
```javascript
// Lấy tất cả documents trong collection
const users = await waterbase.db.collection('users').get();

// Thêm document mới
await waterbase.db.collection('users').add({ name: 'John Doe', age: 30 });

// Lấy 1 document theo ID
const user = await waterbase.db.collection('users').doc('user_id_123').get();

// Cập nhật document
await waterbase.db.collection('users').doc('user_id_123').update({ age: 31 });

// Xóa document
await waterbase.db.collection('users').doc('user_id_123').delete();
```

### Truy Vấn (Query)
```javascript
const activeUsers = await waterbase.db.collection('users')
    .where('status', '==', 'active')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();
```

## 6. Storage (Lưu Trữ File)

Upload và quản lý file.

### Upload File
```javascript
const fileInput = document.getElementById('file-input');
const file = fileInput.files[0];

try {
    const result = await waterbase.storage.upload(file, {
        folder: 'avatars', // Optional metadata
        public: true
    });
    console.log('Upload thành công, File ID:', result.fileId);
} catch (error) {
    console.error('Lỗi upload:', error);
}
```

### Download File
```javascript
// Lấy URL download
const url = waterbase.storage.getDownloadUrl('file_id_123');
window.open(url, '_blank');
```

## 7. Xử Lý Lỗi

SDK ném ra các lỗi chuẩn để bạn dễ dàng xử lý:

```javascript
import { AuthError, NetworkError, ValidationError } from 'waterbase-sdk';

try {
    // ... code
} catch (error) {
    if (error instanceof AuthError) {
        // Lỗi xác thực (sai pass, token hết hạn...)
    } else if (error instanceof NetworkError) {
        // Lỗi mạng
    } else {
        // Lỗi khác
    }
}
```