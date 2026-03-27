# Waterbase SDK - Storage Service (Storage Module)

## Mô tả
Module `storage` quản lý việc tải lên, tải xuống và liệt kê các tệp tin trong hệ thống lưu trữ của Waterbase.

## API chính

### 1. `upload(file, metadata)`
- **Tham số**:
  - `file`: Đối tượng `File` hoặc `Blob`.
  - `metadata`: `{ path: 'thư/mục', metadata: { public: true } }`.
- **Trả về**: Promise chứa `fileId` và `url`.

### 2. `getDownloadUrl(fileId)`
- **Tham số**: `fileId` (hoặc `filename`).
- **Trả về**: `string` (URL trực tiếp). **Không phải Promise**.

### 3. `download(fileId)`
- **Trả về**: Promise chứa đối tượng `Blob` của tệp tin.

### 4. `list(options)`
- `options`: `{ path: 'string', limit: number }`.

### 5. `delete(fileId)`
- Xóa tệp tin vĩnh viễn khỏi storage.

## Lưu ý quan trọng
- Luôn sử dụng `getDownloadUrl` để lấy link hiển thị ảnh/video trên giao diện.
- Giới hạn dung lượng file mặc định thường là 5MB (tùy cấu hình server).
- Các tệp tin được phân loại theo `appId` để đảm bảo tính riêng tư.
