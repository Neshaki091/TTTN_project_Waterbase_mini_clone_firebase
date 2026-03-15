# Waterbase SDK - Storage Service (Storage Module)

## Mô tả
Module Storage cung cấp các chức năng quản lý file: upload, download, lấy URL, liệt kê, xóa, và thống kê dung lượng. Tương tự **Firebase Cloud Storage**.

## Danh sách chức năng

### 1. `upload(file, metadata?, onProgress?)` — Upload file

- **Tham số**:
  - `file` (File | Blob) — file cần upload (bắt buộc).
  - `metadata` (object, tùy chọn):
    - `path` (string): đường dẫn lưu file trên server.
    - `metadata` (object): metadata bổ sung (custom info).
  - `onProgress` (function, tùy chọn): callback theo dõi tiến trình (chưa implement).
- **API Endpoint**: `POST /api/v1/storage/upload`
- **Format**: `multipart/form-data`.
- **Validation**: Throw `ValidationError` nếu `file` không phải `File` hoặc `Blob`.

```javascript
const fileInput = document.getElementById('file-input');
const file = fileInput.files[0];

const result = await waterbase.storage.upload(file, {
    path: 'avatars/user_001',
    metadata: { description: 'User avatar' }
});
console.log('File ID:', result.fileId);
```

---

### 2. `download(fileId)` — Download file (trả về Blob)

- **Tham số**: `fileId` (string) — ID của file (bắt buộc).
- **API Endpoint**: `GET /api/v1/storage/{appId}/{fileId}`
- **Trả về**: `Blob` object.
- **Validation**: Throw `ValidationError` nếu thiếu `fileId`.

```javascript
try {
    const blob = await waterbase.storage.download('file_id_123');
    const url = URL.createObjectURL(blob);
    // Sử dụng url để hiển thị ảnh, video, hoặc download
} catch (error) {
    console.error('Download thất bại:', error);
}
```

---

### 3. `getDownloadUrl(fileId)` — Lấy URL download (đồng bộ)

- **Tham số**: `fileId` (string) — bắt buộc.
- **Trả về**: `string` — URL đầy đủ để truy cập file.
- **Lưu ý**: Method đồng bộ, không gọi API, chỉ tạo URL dựa trên config.

```javascript
const url = waterbase.storage.getDownloadUrl('file_id_123');
// Kết quả: "https://api.waterbase.click/api/v1/storage/{appId}/file_id_123"

// Dùng trong React
<img src={url} alt="Avatar" />
```

---

### 4. `list(options?)` — Liệt kê danh sách file

- **Tham số tùy chọn**:
  - `path` (string): Lọc theo đường dẫn/thư mục.
  - `limit` (number): Số lượng file tối đa.
- **API Endpoint**: `GET /api/v1/storage/files?path=...&limit=...`

```javascript
// Liệt kê tất cả file
const files = await waterbase.storage.list();

// Liệt kê file trong thư mục 'avatars', tối đa 20 file
const avatars = await waterbase.storage.list({ path: 'avatars', limit: 20 });
```

---

### 5. `delete(fileId)` — Xóa file

- **Tham số**: `fileId` (string) — bắt buộc.
- **API Endpoint**: `DELETE /api/v1/storage/files/{fileId}`
- **Validation**: Throw `ValidationError` nếu thiếu `fileId`.

```javascript
await waterbase.storage.delete('file_id_123');
```

---

### 6. `getStats()` — Thống kê storage

- **API Endpoint**: `GET /api/v1/storage/stats`
- **Trả về**: Thông tin tổng dung lượng, số file, v.v.

```javascript
const stats = await waterbase.storage.getStats();
console.log('Dung lượng đã dùng:', stats.totalSize);
console.log('Số file:', stats.totalFiles);
```

---

## Các lỗi thường gặp và cách xử lý

### 1. `ValidationError: First argument must be a File or Blob`
- **Nguyên nhân**: Truyền sai kiểu dữ liệu vào `upload()` (string, number, base64, v.v.).
- **Cách xử lý**: Đảm bảo sử dụng `File` từ `<input type="file">` hoặc tạo `Blob`.
```javascript
// ❌ Sai
await waterbase.storage.upload('path/to/file.jpg');
await waterbase.storage.upload(base64String);

// ✅ Đúng
const file = document.getElementById('input').files[0]; // File object
await waterbase.storage.upload(file);

// Hoặc tạo Blob
const blob = new Blob(['content'], { type: 'text/plain' });
await waterbase.storage.upload(blob);
```

### 2. `ValidationError: File ID is required`
- **Nguyên nhân**: Gọi `download()`, `getDownloadUrl()`, hoặc `delete()` mà không truyền `fileId`.
- **Cách xử lý**: Đảm bảo luôn truyền `fileId` hợp lệ.

### 3. `StorageError: Failed to download file`
- **Nguyên nhân**: `fileId` không tồn tại, file đã bị xóa, hoặc không có quyền truy cập.
- **Cách xử lý**: Kiểm tra `fileId` hợp lệ, đảm bảo user có quyền download.

### 4. Upload file quá kích thước cho phép
- **Nguyên nhân**: Server có giới hạn kích thước file upload.
- **Cách xử lý**: Kiểm tra kích thước file trước khi upload.
```javascript
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
if (file.size > MAX_SIZE) {
    showError('File vượt quá 10MB');
    return;
}
await waterbase.storage.upload(file);
```

### 5. Upload thất bại do timeout
- **Nguyên nhân**: File quá lớn, upload mất nhiều thời gian hơn timeout (mặc định 30s).
- **Cách xử lý**: Tăng `timeout` khi khởi tạo SDK.
```javascript
const waterbase = new Waterbase({
    apiUrl: '...',
    appId: '...',
    timeout: 120000 // 2 phút cho upload file lớn
});
```

### 6. Lỗi CORS khi hiển thị file
- **Nguyên nhân**: URL sinh ra từ `getDownloadUrl()` bị chặn bởi CORS policy.
- **Cách xử lý**: Đảm bảo backend cho phép CORS cho endpoint storage. Hoặc dùng `download()` để lấy Blob rồi tạo Object URL.

### 7. `AuthError` khi upload/download
- **Nguyên nhân**: Storage yêu cầu xác thực, user chưa đăng nhập.
- **Cách xử lý**: Đăng nhập trước khi thao tác file.

### 8. `onProgress` callback không hoạt động
- **Nguyên nhân**: Tham số `onProgress` được khai báo nhưng chưa được implement trong SDK version hiện tại.
- **Cách xử lý**: Hiện tại không thể theo dõi tiến trình upload. Hiển thị loading indicator thay thế.
