# RTDB Example 1: Add a Document
```javascript
async function sendMessage(text, userId) {
  // RTDB (waterbase.rtdb) tối ưu cho tốc độ phản hồi cực nhanh
  // Thường dùng cho Chat, GPS Tracking, Game.
  const message = {
    text,
    userId,
    createdAt: new Date().toISOString()
  };
  
  // Trả về document đã được lưu (kèm theo _id tự sinh)
  return await waterbase.rtdb.collection('messages').add(message);
}
```
# RTDB Example 2: Fetch All Documents
```javascript
async function getAllMessages() {
  // rtdb.get() trả về trực tiếp mảng các documents
  // LƯU Ý: rtdb KHÔNG hỗ trợ where() hay orderBy()
  const messages = await waterbase.rtdb.collection('messages').get();
  return messages;
}
```
# RTDB Example 3: Update and Delete
```javascript
async function manageMessage(id, newText) {
  const docRef = waterbase.rtdb.collection('messages').doc(id);
  
  // Cập nhật một phần của document
  await docRef.update({ text: newText });
  
  // Xóa document
  // await docRef.delete();
}
```
# RTDB Example 4: Get Specific Document
```javascript
async function getMessage(id) {
  return await waterbase.rtdb.collection('messages').doc(id).get();
}
```
