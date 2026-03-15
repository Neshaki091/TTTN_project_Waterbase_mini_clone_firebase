# Waterbase SDK - Realtime Events Service (Realtime Module)

## Mô tả
Module Realtime Events cung cấp kết nối **WebSocket** (qua Socket.IO) để nhận thông báo realtime khi dữ liệu trong collection thay đổi (thêm, sửa, xóa). Tương tự tính năng **onSnapshot** của Firebase Firestore.

## Kiến trúc

```
Client (SDK)
    │
    │  WebSocket (Socket.IO)
    │  path: /api/v1/rtwaterdb/socket.io
    │
    ▼
Waterbase Server
    │
    │  Events: waterdb:event
    │  Types: create, update, delete
    │
    ▼
Collection Data Changes
```

## Danh sách chức năng

### 1. `subscribe(collection, callback)` — Đăng ký lắng nghe thay đổi

- **Tham số**:
  - `collection` (string) — tên collection cần theo dõi (bắt buộc).
  - `callback` (function) — hàm xử lý khi có event (bắt buộc).
- **Trả về**: Hàm `unsubscribe()` — gọi để hủy đăng ký.
- **Hành vi**: Tự động kết nối WebSocket nếu chưa connect.

```javascript
const unsubscribe = waterbase.realtime.subscribe('messages', (event) => {
    switch (event.type) {
        case 'created':
            console.log('Document mới:', event.data);
            break;
        case 'updated':
            console.log('Document cập nhật:', event.data);
            break;
        case 'deleted':
            console.log('Document bị xóa:', event.data);
            break;
    }
});

// Hủy đăng ký khi không cần (component unmount)
unsubscribe();
```

### Event Types:

| Event Type | Mô tả | Khi nào xảy ra |
|-----------|--------|-----------------|
| `created` | Document mới được tạo | Sau `add()` vào collection |
| `updated` | Document bị cập nhật | Sau `set()` hoặc `update()` |
| `deleted` | Document bị xóa | Sau `delete()` document |

---

### 2. `unsubscribe(collection)` — Hủy đăng ký 1 collection

- **Tham số**: `collection` (string) — tên collection.
- **Hành vi**: Emit `unsubscribe` event đến server, remove listeners. Nếu không còn subscription nào, tự động `disconnect()`.

```javascript
waterbase.realtime.unsubscribe('messages');
```

---

### 3. `disconnect()` — Ngắt kết nối WebSocket hoàn toàn

- **Hành vi**: Đóng socket, reset trạng thái, xóa tất cả subscriptions.

```javascript
waterbase.realtime.disconnect();
```

---

### 4. `isRealtimeConnected()` — Kiểm tra trạng thái kết nối

- **Trả về**: `boolean` — `true` nếu WebSocket đang kết nối.

```javascript
if (waterbase.realtime.isRealtimeConnected()) {
    console.log('Đang kết nối realtime');
}
```

---

## Cấu hình kết nối Socket.IO

| Thuộc tính | Giá trị | Mô tả |
|-----------|---------|--------|
| `path` | `/api/v1/rtwaterdb/socket.io` | Path Socket.IO trên server |
| `transports` | `['websocket', 'polling']` | Ưu tiên WebSocket, fallback polling |
| `reconnection` | `true` | Tự động reconnect |
| `reconnectionDelay` | `1000` ms | Delay ban đầu khi reconnect |
| `reconnectionDelayMax` | `5000` ms | Delay tối đa khi reconnect |
| `reconnectionAttempts` | `10` | Số lần reconnect tối đa |

**Query parameters** gửi khi kết nối:
- `appId`: Application ID.
- `token`: User token hoặc API key (fallback).

---

## Auto-Reconnect & Re-subscribe

Khi WebSocket kết nối lại sau khi mất kết nối:
1. Tự động chạy lại tất cả `subscribe()` đã đăng ký trước đó.
2. Không cần user gọi lại `subscribe()`.

---

## Các lỗi thường gặp và cách xử lý

### 1. `Error: Collection name and callback are required`
- **Nguyên nhân**: Gọi `subscribe()` thiếu tên collection hoặc callback.
- **Cách xử lý**: Đảm bảo truyền đủ cả 2 tham số.
```javascript
// ❌ Sai
waterbase.realtime.subscribe('messages');
waterbase.realtime.subscribe(null, callback);

// ✅ Đúng
waterbase.realtime.subscribe('messages', (event) => { ... });
```

### 2. Không nhận được event realtime
- **Nguyên nhân có thể**:
  - WebSocket chưa kết nối (kiểm tra `isRealtimeConnected()`).
  - Server chưa emit event cho collection đó.
  - Tên collection sai (phân biệt hoa/thường).
  - Bị firewall/proxy chặn WebSocket.
- **Cách xử lý**:
  1. Bật `debug: true` khi khởi tạo SDK để xem log kết nối.
  2. Kiểm tra `isRealtimeConnected()` trước khi subscribe.
  3. Đảm bảo server hỗ trợ WebSocket.

### 3. Kết nối WebSocket bị ngắt liên tục
- **Nguyên nhân**: Mạng không ổn định, server restart, hoặc token hết hạn.
- **Cách xử lý**: SDK tự reconnect tối đa 10 lần. Sau 10 lần thất bại cần kiểm tra:
  - Kết nối mạng.
  - Server hoạt động bình thường.
  - Token/API key còn hiệu lực.

### 4. Event `connect_error` liên tục
- **Nguyên nhân**: URL server sai, port bị chặn, hoặc CORS.
- **Cách xử lý**: Kiểm tra `apiUrl` configuration, đảm bảo server cho phép WebSocket connections.

### 5. Memory leak do không unsubscribe
- **Nguyên nhân**: Không gọi `unsubscribe()` hoặc hàm cleanup khi component unmount (React).
- **Cách xử lý**:
```javascript
// React component
useEffect(() => {
    const unsubscribe = waterbase.realtime.subscribe('messages', handler);
    return () => unsubscribe(); // Cleanup khi unmount
}, []);
```

### 6. Không nhận event sau khi reconnect
- **Nguyên nhân**: Server không hỗ trợ re-subscribe tự động.
- **Cách xử lý**: SDK đã tự re-subscribe sau reconnect. Nếu vẫn không nhận, thử `disconnect()` rồi `subscribe()` lại.

### 7. Nhận event trùng lặp (duplicate)
- **Nguyên nhân**: Subscribe nhiều lần vào cùng 1 collection mà không unsubscribe trước.
- **Cách xử lý**: Kiểm tra logic subscribe, đảm bảo chỉ subscribe 1 lần per collection.
