# Realtime Example 1: Basic Subscription
```javascript
// Lắng nghe sự kiện từ collection 'messages'
const unsubscribe = waterbase.realtime.subscribe('messages', (event) => {
  // event.type có thể là: 'created', 'updated', 'deleted'
  if (event.type === 'created') {
    console.log('New message received:', event.data.text);
  }
});

// Khi không cần lắng nghe nữa (ví dụ: unmount component React)
// unsubscribe();
```
# Realtime Example 2: Handling All Event Types
```javascript
waterbase.realtime.subscribe('notifications', (event) => {
  const { type, data } = event;
  
  switch (type) {
    case 'created':
      console.log('Document added:', data);
      break;
    case 'updated':
      console.log('Document changed:', data);
      break;
    case 'deleted':
      console.log('Document removed:', data);
      break;
  }
});
```
# Realtime Example 3: Connection Status
```javascript
// Kiểm tra xem socket có đang kết nối hay không
if (waterbase.realtime.isRealtimeConnected()) {
  console.log('Realtime is active');
}
```
# Realtime Example 4: Manual Disconnect
```javascript
function shutDown() {
  // Ngắt kết nối socket hoàn toàn và xóa bỏ các subscription
  waterbase.realtime.disconnect();
}
```
# Realtime Example 5: React Integration (Hook)
```javascript
useEffect(() => {
  // Khởi tạo subscription khi component mount
  const unsub = waterbase.realtime.subscribe('chat_rooms', (e) => {
    updateRooms(e.data);
  });
  
  // Cleanup: Tự động unsubscribe khi component unmount
  return () => unsub();
}, []);
```
