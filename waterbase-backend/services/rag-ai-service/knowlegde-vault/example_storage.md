# Storage Example 1: Uploading a File
```javascript
async function uploadFile(file) {
  try {
    // metadata có 2 trường: path (thư mục) và metadata (dữ liệu tùy biến)
    const result = await waterbase.storage.upload(file, {
      path: 'uploads/2024',
      metadata: { 
        isPublic: true,
        author: 'admin'
      }
    });
    
    // Response chứa thông tin file bao gồm id/filename
    const fileId = result.fileId || result.filename;
    return fileId;
  } catch (err) {
    console.error('Upload error:', err.message);
  }
}
```
# Storage Example 2: Get Download URL and Download
```javascript
// 1. Chỉ lấy URL (để hiển thị thẻ <img src={url} />)
const url = waterbase.storage.getDownloadUrl('file-id-123');

// 2. Tải về dưới dạng Blob (để lưu file xuống máy)
async function saveFile(fileId) {
  const blob = await waterbase.storage.download(fileId);
  const downloadUrl = window.URL.createObjectURL(blob);
  // ... xử lý tải về
}
```
# Storage Example 3: Manage Files
```javascript
async function storageManagement() {
  // Liệt kê danh sách file
  const files = await waterbase.storage.list({ path: 'avatars', limit: 10 });
  
  // Xóa file
  if (files.length > 0) {
    await waterbase.storage.delete(files[0].fileId);
  }
}
```
