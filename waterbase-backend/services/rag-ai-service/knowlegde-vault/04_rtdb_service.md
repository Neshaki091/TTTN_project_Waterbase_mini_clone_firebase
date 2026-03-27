# Waterbase SDK - Realtime Database Service (RTDB Module)

## Mô tả
`rtdb` (RTWaterDB) được tối ưu cho các tác vụ cần độ trễ thấp và tần suất thay đổi cao. **KHÔNG** hỗ trợ các truy vấn phức tạp như `where` hay `orderBy`.

## Cú pháp cơ bản

### 1. Truy cập Collection
`const collection = waterbase.rtdb.collection('name');`

### 2. Thêm dữ liệu (`add`)
```javascript
const result = await collection.add({ text: 'Hello' });
// Trả về document đã tạo kèm _id
```

### 3. Lấy dữ liệu (`get`)
- **Toàn bộ collection**: `await collection.get();` (Trả về mảng)
- **Một document**: `await collection.doc('id').get();`

### 4. Cập nhật dữ liệu (`update`)
- **Chỉ cập nhật field chỉ định**: `await collection.doc('id').update({ text: 'New' });`

### 5. Xóa dữ liệu (`delete`)
- `await collection.doc('id').delete();`

## Phân biệt với Database Module
- `rtdb`: Nhanh, nhẹ, không có Query (where/limit).
- `db`: Hỗ trợ Query, chậm hơn một chút, phù hợp quản lý data lớn.
