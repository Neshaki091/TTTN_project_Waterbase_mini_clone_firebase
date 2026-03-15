# Waterbase SDK - Realtime Database Service (RTWaterDB Module)

## Mô tả
Module RTWaterDB (Realtime Database) cung cấp CSDL thời gian thực tốc độ cao, tương tự **Firebase Realtime Database**. Thích hợp cho các tính năng cần đồng bộ dữ liệu tức thì như: chat, thông báo, trạng thái online, game multiplayer.

## Sự khác biệt giữa WaterDB và RTWaterDB

| Đặc điểm | WaterDB (`waterbase.db`) | RTWaterDB (`waterbase.rtdb`) |
|-----------|--------------------------|------------------------------|
| Lưu trữ | Bền vững (persistent) | Thời gian thực (realtime) |
| Tốc độ | Bình thường | Cao (tối ưu tốc độ) |
| Query | Hỗ trợ `where`, `orderBy`, `limit` | Chỉ CRUD cơ bản |
| API Prefix | `/api/v1/waterdb/` | `/api/v1/rtwaterdb/` |
| Use case | Profile, settings, bài viết | Chat, notifications, presence |

## Danh sách chức năng

### 1. Collection Reference

#### `waterbase.rtdb.collection(collectionName)` — Tham chiếu đến Collection
- **Trả về**: `RtCollectionReference` object.

---

### 2. Đọc dữ liệu

#### `collection.get()` — Lấy tất cả documents
- **API Endpoint**: `GET /api/v1/rtwaterdb/{collectionName}`
- **Trả về**: Array documents hoặc response data.

```javascript
const messages = await waterbase.rtdb.collection('messages').get();
```

#### `collection.doc(docId).get()` — Lấy 1 document
- **API Endpoint**: `GET /api/v1/rtwaterdb/{collectionName}/{docId}`

```javascript
const message = await waterbase.rtdb.collection('messages').doc('msg_001').get();
```

---

### 3. Tạo dữ liệu

#### `collection.add(data)` — Thêm document mới
- **Tham số**: `data` (object) — bắt buộc phải là object.
- **API Endpoint**: `POST /api/v1/rtwaterdb/{collectionName}`
- **Validation**: Throw `ValidationError` nếu data không hợp lệ.

```javascript
await waterbase.rtdb.collection('messages').add({
    text: 'Hello World',
    userId: 'user_123',
    createdAt: new Date().toISOString()
});
```

---

### 4. Cập nhật dữ liệu

#### `collection.doc(docId).update(data)` — Cập nhật document
- **Tham số**: `data` (object) — các trường cần cập nhật.
- **API Endpoint**: `PUT /api/v1/rtwaterdb/{collectionName}/{docId}`

```javascript
await waterbase.rtdb.collection('messages').doc('msg_001').update({
    text: 'Updated message'
});
```

**Lưu ý**: RTWaterDB **không có** method `set()` như WaterDB, chỉ có `update()`.

---

### 5. Xóa dữ liệu

#### `collection.doc(docId).delete()` — Xóa document
- **API Endpoint**: `DELETE /api/v1/rtwaterdb/{collectionName}/{docId}`

```javascript
await waterbase.rtdb.collection('messages').doc('msg_001').delete();
```

---

## Xử lý dữ liệu trả về

Dữ liệu từ RTWaterDB có thể có **cấu trúc lồng nhau** (nested), cần flatten trước khi sử dụng:

```javascript
const response = await waterbase.rtdb.collection('messages').get();
const messages = (response.documents || []).map(doc => ({
    ...doc,
    ...(doc.data || {})
}));
```

---

## Các lỗi thường gặp và cách xử lý

### 1. `ValidationError: Document data must be an object`
- **Nguyên nhân**: Gọi `add()` với tham số không phải object.
- **Cách xử lý**: Đảm bảo truyền JavaScript object `{}`.

### 2. `ValidationError: Update data must be an object`
- **Nguyên nhân**: Gọi `update()` với tham số không hợp lệ.
- **Cách xử lý**: Truyền object chứa các field cần update.

### 3. Dữ liệu không hiển thị sau khi `add()`
- **Nguyên nhân**: Chưa subscribe vào realtime events, chỉ thấy data khi refresh/get lại.
- **Cách xử lý**: Kết hợp `waterbase.realtime.subscribe()` để nhận data realtime (xem module Realtime Events).

### 4. `AuthError` khi truy cập collection
- **Nguyên nhân**: Chưa đăng nhập hoặc token hết hạn.
- **Cách xử lý**: Đăng nhập trước khi thao tác với RTDB.

### 5. Dữ liệu trả về có cấu trúc lồng nhau
- **Nguyên nhân**: Backend wrap data trong object `{ data: {...} }`.
- **Cách xử lý**: Flatten data như hướng dẫn ở trên.

### 6. Gọi `set()` bị lỗi `TypeError`
- **Nguyên nhân**: RTWaterDB không có method `set()`, chỉ WaterDB mới có.
- **Cách xử lý**: Sử dụng `update()` thay thế, hoặc đổi sang `waterbase.db` nếu cần method `set()`.

### 7. `NetworkError: Request timeout` khi lấy collection lớn
- **Nguyên nhân**: Collection chứa quá nhiều documents.
- **Cách xử lý**: RTWaterDB không hỗ trợ `limit()`. Cân nhắc phân chia data vào nhiều collection nhỏ hơn.
