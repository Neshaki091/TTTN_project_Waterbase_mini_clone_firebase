# Waterbase SDK - Database Service (WaterDB Module)

## Mô tả
`db` (WaterDB) cung cấp khả năng lưu trữ dữ liệu với các tính năng truy vấn mạnh mẽ tương tự Firebase Firestore.

## Truy vấn (Query)

### 1. `where(field, operator, value)`
- Toán tử hỗ trợ: `==`, `>=`, `<=`, `>`, `<`, `!=`.
- Có thể nối chuỗi nhiều `.where()`.

### 2. `orderBy(field, direction)`
- `direction`: `'asc'` (mặc định) hoặc `'desc'`.

### 3. `limit(number)`
- Giới hạn số lượng bản ghi trả về.

## Ví dụ truy vấn
```javascript
const products = await waterbase.db.collection('products')
    .where('price', '<=', 100)
    .orderBy('price', 'desc')
    .limit(5)
    .get();
```

## Thao tác Document

### 1. `add(data)`
- Lưu vào collection với ID tự sinh.

### 2. `doc(id).set(data)`
- Lưu vào ID chỉ định. Nếu đã tồn tại sẽ ghi đè toàn bộ.

### 3. `doc(id).update(data)`
- Chỉ cập nhật các field có trong `data`.

### 4. `doc(id).delete()`
- Xóa bản ghi.
