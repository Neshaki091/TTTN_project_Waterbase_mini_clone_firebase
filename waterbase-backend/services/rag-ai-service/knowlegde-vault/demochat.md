# Demo Chat React Analysis (Waterbase SDK Integration)

Tài liệu này tổng hợp cách ứng dụng `demo-chat-react` tích hợp và sử dụng các dịch vụ của Waterbase thông qua `waterbase-sdk`. Các thông tin này cung cấp Context (ngữ cảnh) cần thiết cho dịch vụ RAG AI.

## 1. Cấu hình SDK (Configuration)

Ứng dụng khởi tạo SDK bằng cách đọc file cấu hình tĩnh từ thư mục public (`public/waterbase-service.json`).

**File `waterbase-service.json`:**
```json
{
  "apiUrl": "https://api.waterbase.click",
  "appId": "your-app-id",
  "apiKey": "your-api-key",
  "projectName": "Chat-Demo",
  "projectDescription": "Demo chat sử dụng SDK"
}
```

**Khởi tạo SDK (`src/waterbase.js`):**
```javascript
waterbaseInstance = new Waterbase({
    apiUrl: config.apiUrl,
    appId: config.appId,
    apiKey: config.apiKey,
    debug: true
});
```

## 2. Dịch vụ Authentication (Xác thực người dùng)

Ứng dụng gọi các phương thức auth từ `waterbase.auth`:

- **Đăng ký (Register):**
  ```javascript
  const result = await waterbase.auth.registerUser({
      email: "user@example.com",
      password: "password123",
      username: "user" 
  });
  ```
- **Đăng nhập (Login):**
  ```javascript
  const result = await waterbase.auth.loginUser(email, password);
  ```
- **Lấy thông tin User hiện tại:**
  ```javascript
  const currentUser = waterbase.auth.getCurrentUser();
  ```
- **Đăng xuất (Logout):**
  ```javascript
  waterbase.auth.logoutUser();
  ```

## 3. Dịch vụ Realtime Database (RTDB)

Collection chính được sử dụng: `messages`.

**Schema dữ liệu của 1 Message:**
```json
{
  "text": "Nội dung tin nhắn (String)",
  "userId": "ID của người gửi (String)",
  "username": "Tên người gửi (String)",
  "createdAt": "Thời gian gửi (ISO String Date)",
  "imageUrl": "URL ảnh nếu có upload ảnh (String - Optional)",
  "imageId": "ID của file ảnh trên Storage (String - Optional)"
}
```

**Thao tác dữ liệu (CRUD & Realtime):**

- **Lấy toàn bộ tin nhắn (Get):**
  ```javascript
  const response = await waterbase.rtdb.collection('messages').get();
  // Response thường trả về mảng hoặc object có chứa `{ documents: [...] }`.
  // Cần map và trải (flatten) dữ liệu doc.data ra ngoài.
  ```

- **Thêm tin nhắn mới (Add):**
  ```javascript
  await waterbase.rtdb.collection('messages').add({
      text: newMessage,
      userId: user._id,
      username: user.username || user.email,
      createdAt: new Date().toISOString()
  });
  ```

- **Lắng nghe sự kiện Realtime (Subscribe):**
  ```javascript
  waterbase.realtime.subscribe('messages', (event) => {
      // event.type có thể là: 'created', 'updated', 'deleted'
      // event.data chứa toàn bộ thông tin document
  });
  ```

- **Hủy lắng nghe (Unsubscribe):**
  ```javascript
  waterbase.realtime.unsubscribe('messages');
  ```

## 4. Dịch vụ Storage (Lưu trữ file)

Ứng dụng cho phép upload file ảnh (dung lượng < 5MB).

- **Upload file:**
  ```javascript
  const result = await waterbase.storage.upload(file, {
      path: 'chat-images',
      metadata: { public: true }
  });
  ```

- **Xử lý Response sau khi upload để lấy ID và URL:**
  ```javascript
  // Lấy Identifier (ID) của file từ nhiều dạng response khác nhau của SDK
  const fileIdentifier = result.file?.id || result.fileId || result.filename || result._id;

  // Lấy URL public để hiển thị
  const imageUrl = waterbase.storage.getDownloadUrl(fileIdentifier);
  ```

## 5. Tổng kết

Ứng dụng React này là một ví dụ hoàn chỉnh về cách sử dụng `waterbase-sdk` tại client-side để gọi các dịch vụ BaaS của nền tảng Waterbase (Auth, Database, Realtime, Storage). AI RAG Service sử dụng thông tin này để hiểu cách frontend giao tiếp với Waterbase API và cung cấp code snippet mẫu (React/JS).
