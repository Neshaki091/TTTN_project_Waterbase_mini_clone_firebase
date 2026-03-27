# Database (WaterDB) Example 1: Query with Where
```javascript
async function findActiveUsers() {
  // Database module (waterbase.db) hỗ trợ truy vấn nâng cao
  // Hỗ trợ các toán tử: '==', '!=', '>', '>=', '<', '<=', 'in', 'contains'
  const users = await waterbase.db.collection('users')
    .where('status', '==', 'active')
    .get();
  return users; // Trả về mảng các documents
}
```
# Database Example 2: Multiple Where Clauses
```javascript
async function findPremiumRecentUsers() {
  // Bạn có thể nối nhiều điều kiện where()
  return await waterbase.db.collection('users')
    .where('status', '==', 'active')
    .where('plan', '==', 'premium')
    .get();
}
```
# Database Example 3: OrderBy and Limit
```javascript
async function getLatestPosts() {
  // Hỗ trợ sắp xếp (asc/desc) và giới hạn số lượng kết quả
  return await waterbase.db.collection('posts')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();
}
```
# Database Example 4: Complex Query
```javascript
async function queryProducts() {
  return await waterbase.db.collection('products')
    .where('price', '<=', 500)
    .orderBy('price', 'asc')
    .limit(5)
    .get();
}
```
# Database Example 5: Setting and Updating Documents
```javascript
async function manageDoc(docId, data) {
  const docRef = waterbase.db.collection('profiles').doc(docId);
  
  // set() thay thế toàn bộ hoặc tạo mới
  await docRef.set(data);
  
  // update() chỉ cập nhật các trường được chỉ định (merge)
  await docRef.update({ lastActive: new Date().toISOString() });
  
  // delete() để xóa document
  // await docRef.delete();
}
```
