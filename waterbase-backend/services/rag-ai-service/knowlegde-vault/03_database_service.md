# Waterbase SDK - Database Service (WaterDB Module)

## Mô tả
Module WaterDB cung cấp CSDL document-based bền vững (persistent), hoạt động tương tự **Firebase Firestore**. Dữ liệu được tổ chức theo mô hình **Collection → Document**. Hỗ trợ CRUD đầy đủ và hệ thống Query mạnh mẽ với `where`, `orderBy`, `limit`.

## Cấu trúc dữ liệu
```
Collection (ví dụ: "users")
├── Document 1 (id: "user_001") → { name: "John", age: 30 }
├── Document 2 (id: "user_002") → { name: "Jane", age: 25 }
└── Document 3 (id: "user_003") → { name: "Bob", age: 35 }
```

## Danh sách chức năng

### 1. Collection Reference

#### `waterbase.db.collection(collectionName)` — Tham chiếu đến Collection
- **Tham số**: `collectionName` (string) — tên collection.
- **Trả về**: `CollectionReference` object.

---

### 2. Đọc dữ liệu

#### `collection.get(options?)` — Lấy tất cả documents trong collection
- **Tham số tùy chọn**:
  - `where`: Object điều kiện lọc (JSON).
  - `orderBy`: Trường sắp xếp.
  - `limit`: Số lượng kết quả tối đa.
- **API Endpoint**: `GET /api/v1/waterdb/{collectionName}?where=...&orderBy=...&limit=...`

```javascript
const users = await waterbase.db.collection('users').get();
```

#### `collection.doc(docId).get()` — Lấy 1 document theo ID
- **API Endpoint**: `GET /api/v1/waterdb/{collectionName}/{docId}`

```javascript
const user = await waterbase.db.collection('users').doc('user_001').get();
```

---

### 3. Tạo dữ liệu

#### `collection.add(data)` — Thêm document mới (auto-generate ID)
- **Tham số**: `data` (object) — dữ liệu document, phải là object.
- **API Endpoint**: `POST /api/v1/waterdb/{collectionName}`
- **Validation**: Throw `ValidationError` nếu `data` không phải object.

```javascript
const newUser = await waterbase.db.collection('users').add({
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    createdAt: new Date().toISOString()
});
```

---

### 4. Cập nhật dữ liệu

#### `collection.doc(docId).set(data)` — Ghi đè toàn bộ document
- **Tham số**: `data` (object) — dữ liệu mới, thay thế hoàn toàn document cũ.
- **API Endpoint**: `PUT /api/v1/waterdb/{collectionName}/{docId}`

```javascript
await waterbase.db.collection('users').doc('user_001').set({
    name: 'New Name',
    email: 'new@example.com'
});
```

#### `collection.doc(docId).update(data)` — Cập nhật một phần document
- **Tham số**: `data` (object) — chỉ chứa các trường cần cập nhật.
- **API Endpoint**: `PUT /api/v1/waterdb/{collectionName}/{docId}`
- **Lưu ý**: Backend chỉ hỗ trợ PUT (không có PATCH riêng), nhưng PUT sẽ merge data thay vì replace toàn bộ.

```javascript
await waterbase.db.collection('users').doc('user_001').update({
    age: 31  // Chỉ cập nhật trường age
});
```

---

### 5. Xóa dữ liệu

#### `collection.doc(docId).delete()` — Xóa document
- **API Endpoint**: `DELETE /api/v1/waterdb/{collectionName}/{docId}`

```javascript
await waterbase.db.collection('users').doc('user_001').delete();
```

---

### 6. Query (Truy vấn nâng cao)

SDK hỗ trợ xây dựng query theo chuỗi (chainable):

#### `collection.where(field, operator, value)` — Lọc dữ liệu
- **Operators hỗ trợ**: `==`, `!=`, `>`, `<`, `>=`, `<=`, v.v.
- Có thể gọi nhiều lần để kết hợp nhiều điều kiện.

#### `collection.orderBy(field, direction?)` — Sắp xếp
- **direction**: `'asc'` (mặc định) hoặc `'desc'`.

#### `collection.limit(n)` — Giới hạn số kết quả

#### Query kết hợp
```javascript
const results = await waterbase.db.collection('users')
    .where('status', '==', 'active')
    .where('age', '>=', 18)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();
```

**Cách query được gửi lên API**:
- `where` → JSON stringify: `?where=[{"field":"status","operator":"==","value":"active"}]`
- `orderBy` → format: `?orderBy=createdAt:desc`
- `limit` → number: `?limit=10`

---

## Các lỗi thường gặp và cách xử lý

### 1. `ValidationError: Document data must be an object`
- **Nguyên nhân**: Gọi `add()`, `set()` với tham số không phải object (ví dụ: `null`, `undefined`, string, number).
- **Cách xử lý**: Đảm bảo data truyền vào là một JavaScript object `{}`.
```javascript
// ❌ Sai
await waterbase.db.collection('users').add('John Doe');
await waterbase.db.collection('users').add(null);

// ✅ Đúng
await waterbase.db.collection('users').add({ name: 'John Doe' });
```

### 2. `ValidationError: Update data must be an object`
- **Nguyên nhân**: Gọi `update()` với tham số không phải object.
- **Cách xử lý**: Tương tự lỗi trên, truyền object hợp lệ.

### 3. Document không tồn tại (HTTP 404)
- **Nguyên nhân**: Gọi `get()`, `set()`, `update()`, `delete()` với `docId` không tồn tại.
- **Cách xử lý**: Kiểm tra document tồn tại trước khi thao tác, hoặc bắt lỗi.
```javascript
try {
    const doc = await waterbase.db.collection('users').doc('invalid_id').get();
} catch (error) {
    if (error.message.includes('404')) {
        console.log('Document không tồn tại');
    }
}
```

### 4. Collection rỗng trả về mảng trống
- **Nguyên nhân**: Collection chưa có document nào, hoặc tên collection bị sai.
- **Cách xử lý**: Kiểm tra tên collection chính xác, xử lý trường hợp data rỗng trong UI.
```javascript
const users = await waterbase.db.collection('users').get();
if (!users || users.length === 0) {
    showMessage('Chưa có dữ liệu');
}
```

### 5. Query không trả về kết quả mong đợi
- **Nguyên nhân**: Sai operator, sai tên field, hoặc giá trị so sánh không khớp kiểu dữ liệu.
- **Cách xử lý**: Kiểm tra tên field chính xác (phân biệt hoa/thường), đảm bảo kiểu dữ liệu value khớp.

### 6. `AuthError` khi truy cập collection
- **Nguyên nhân**: User chưa đăng nhập hoặc token hết hạn, collection yêu cầu xác thực.
- **Cách xử lý**: Đảm bảo user đã `loginUser()` trước khi truy cập, SDK sẽ tự refresh token nếu cần.

### 7. `NetworkError: Request timeout`
- **Nguyên nhân**: Query quá nặng (collection lớn, không có index) hoặc server quá tải.
- **Cách xử lý**: Dùng `limit()` để giới hạn kết quả, tối ưu query conditions.
