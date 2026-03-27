# Waterbase SDK - Realtime Events (Realtime Module)

## Mô tả
Module `realtime` sử dụng WebSocket để nhận thông báo tức thời khi dữ liệu trong `db` hoặc `rtdb` thay đổi.

## API chính

### 1. `subscribe(collection, callback)`
- **Tham số**: Tên collection và hàm callback.
- **Trả về**: Hàm `unsubscribe`.
- **Hành vi**: Tự động kết nối nếu chưa có connection.

```javascript
const unsub = waterbase.realtime.subscribe('messages', (event) => {
    // event object: { type: 'created' | 'updated' | 'deleted', data: Object }
});
```

### 2. `unsubscribe(collection)`
- Ngừng lắng nghe một collection.

### 3. `disconnect()`
- Ngắt kết nối socket hoàn toàn và xóa mọi subscription.

### 4. `isRealtimeConnected()`
- Kiểm tra trạng thái kết nối socket hiện tại.

## Chú ý quan trọng
- **Đừng dùng `waterbase.socket`**. Phải dùng `waterbase.rtdb`.
- Callback luôn nhận object với field `type` là hậu tố **-ed** (`created`, `updated`, `deleted`).
- Luôn gọi hàm `unsub()` khi component bị hủy để tránh memory leak.
