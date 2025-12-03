# Waterbase SDK - Hướng dẫn sử dụng (JavaScript/React)

## Giới thiệu

Waterbase SDK là thư viện JavaScript giúp bạn tương tác với backend Waterbase - một giải pháp thay thế Firebase. SDK hỗ trợ:
- ✅ Authentication (Đăng ký, đăng nhập, quản lý người dùng)
- ✅ Database (CRUD operations với collections)
- ✅ Realtime Database (Dữ liệu thời gian thực)
- ✅ Storage (Upload/download files)
- ✅ Rules (Quản lý quyền truy cập)

## Cài đặt

### NPM
```bash
npm install waterbase-sdk
```

### Yarn
```bash
yarn add waterbase-sdk
```

### CDN (Browser)
```html
<script type="module">
  import Waterbase from 'https://unpkg.com/waterbase-sdk@3.0.0/index.js';
</script>
```

## Cấu hình

### Cách 1: Sử dụng waterbase-service.json (Khuyến nghị)

1. **Download file cấu hình** từ Waterbase Console:
   - Vào trang quản lý app của bạn
   - Chọn tab "Settings"
   - Click "Download Service.json"

2. **Đặt file vào thư mục root** của project:
```
your-project/
├── waterbase-service.json  ← Đặt file ở đây
├── package.json
├── src/
└── ...
```

3. **Khởi tạo SDK** (tự động load config):
```javascript
import Waterbase from 'waterbase-sdk';

// SDK sẽ tự động tìm và load waterbase-service.json
const waterbase = new Waterbase();
```

**Format của waterbase-service.json:**
```json
{
  "apiUrl": "http://api.waterbase.click",
  "appId": "your-app-id",
  "apiKey": "wbase_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "projectName": "My Awesome App",
  "projectDescription": "Description of my app"
}
```

### Cách 2: Cấu hình thủ công

```javascript
import Waterbase from 'waterbase-sdk';

const waterbase = new Waterbase({
  apiUrl: 'http://api.waterbase.click',
  appId: 'your-app-id',
  apiKey: 'your-api-key',  // Optional
  debug: true  // Bật debug logs
});
```

## Sử dụng

### 1. Authentication (Xác thực)

#### Đăng ký người dùng mới
```javascript
try {
  const result = await waterbase.auth.signUp({
    email: 'user@example.com',
    password: 'securePassword123',
    username: 'johndoe'
  });
  
  console.log('User registered:', result.user);
  console.log('Access token:', result.accessToken);
} catch (error) {
  console.error('Sign up failed:', error.message);
}
```

#### Đăng nhập
```javascript
try {
  const result = await waterbase.auth.signIn({
    email: 'user@example.com',
    password: 'securePassword123'
  });
  
  console.log('Logged in:', result.user);
  // Token được tự động lưu và sử dụng cho các request sau
} catch (error) {
  console.error('Login failed:', error.message);
}
```

#### Đăng xuất
```javascript
waterbase.auth.signOut();
console.log('Logged out successfully');
```

#### Lấy thông tin user hiện tại
```javascript
const currentUser = waterbase.auth.getCurrentUser();
if (currentUser) {
  console.log('Current user:', currentUser);
} else {
  console.log('No user logged in');
}
```

#### Kiểm tra trạng thái đăng nhập
```javascript
if (waterbase.auth.isAuthenticated()) {
  console.log('User is logged in');
} else {
  console.log('User is not logged in');
}
```

### 2. Database (WaterDB)

#### Tạo document mới
```javascript
try {
  const newTodo = await waterbase.db.collection('todos').add({
    title: 'Learn Waterbase',
    completed: false,
    createdAt: new Date().toISOString()
  });
  
  console.log('Created todo:', newTodo);
} catch (error) {
  console.error('Error creating todo:', error.message);
}
```

#### Lấy tất cả documents
```javascript
try {
  const todos = await waterbase.db.collection('todos').get();
  console.log('All todos:', todos);
} catch (error) {
  console.error('Error fetching todos:', error.message);
}
```

#### Lấy document theo ID
```javascript
try {
  const todo = await waterbase.db
    .collection('todos')
    .doc('document-id')
    .get();
  
  console.log('Todo:', todo);
} catch (error) {
  console.error('Error fetching todo:', error.message);
}
```

#### Cập nhật document
```javascript
try {
  const updated = await waterbase.db
    .collection('todos')
    .doc('document-id')
    .update({
      completed: true,
      updatedAt: new Date().toISOString()
    });
  
  console.log('Updated todo:', updated);
} catch (error) {
  console.error('Error updating todo:', error.message);
}
```

#### Xóa document
```javascript
try {
  await waterbase.db
    .collection('todos')
    .doc('document-id')
    .delete();
  
  console.log('Todo deleted');
} catch (error) {
  console.error('Error deleting todo:', error.message);
}
```

### 3. Realtime Database

#### Kết nối và lắng nghe thay đổi
```javascript
// Kết nối realtime
await waterbase.realtime.connect();

// Lắng nghe thay đổi trên collection
waterbase.realtime.on('todos', (event) => {
  console.log('Event type:', event.type); // 'create', 'update', 'delete'
  console.log('Document:', event.data);
  
  if (event.type === 'create') {
    console.log('New todo created:', event.data);
  } else if (event.type === 'update') {
    console.log('Todo updated:', event.data);
  } else if (event.type === 'delete') {
    console.log('Todo deleted:', event.data);
  }
});

// Ngừng lắng nghe
waterbase.realtime.off('todos');

// Ngắt kết nối
waterbase.realtime.disconnect();
```

#### Ví dụ với React
```javascript
import { useEffect, useState } from 'react';
import Waterbase from 'waterbase-sdk';

const waterbase = new Waterbase();

function TodoList() {
  const [todos, setTodos] = useState([]);

  useEffect(() => {
    // Load initial data
    waterbase.db.collection('todos').get()
      .then(data => setTodos(data));

    // Connect realtime
    waterbase.realtime.connect();

    // Listen for changes
    waterbase.realtime.on('todos', (event) => {
      if (event.type === 'create') {
        setTodos(prev => [...prev, event.data]);
      } else if (event.type === 'update') {
        setTodos(prev => prev.map(todo => 
          todo._id === event.data._id ? event.data : todo
        ));
      } else if (event.type === 'delete') {
        setTodos(prev => prev.filter(todo => todo._id !== event.data._id));
      }
    });

    // Cleanup
    return () => {
      waterbase.realtime.off('todos');
      waterbase.realtime.disconnect();
    };
  }, []);

  return (
    <div>
      {todos.map(todo => (
        <div key={todo._id}>{todo.title}</div>
      ))}
    </div>
  );
}
```

### 4. Storage (Lưu trữ file)

#### Upload file
```javascript
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

try {
  const result = await waterbase.storage.upload(file, (progress) => {
    console.log(`Upload progress: ${progress}%`);
  });
  
  console.log('File uploaded:', result);
  console.log('File URL:', result.url);
} catch (error) {
  console.error('Upload failed:', error.message);
}
```

#### Lấy danh sách files
```javascript
try {
  const files = await waterbase.storage.list();
  console.log('Files:', files);
} catch (error) {
  console.error('Error listing files:', error.message);
}
```

#### Download file
```javascript
try {
  const blob = await waterbase.storage.download('file-id');
  
  // Tạo download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'filename.ext';
  a.click();
} catch (error) {
  console.error('Download failed:', error.message);
}
```

#### Xóa file
```javascript
try {
  await waterbase.storage.delete('file-id');
  console.log('File deleted');
} catch (error) {
  console.error('Delete failed:', error.message);
}
```

### 5. Rules (Quản lý quyền)

#### Lấy rules theo role
```javascript
try {
  const rules = await waterbase.rules.getRulesByRole('user');
  console.log('User rules:', rules);
} catch (error) {
  console.error('Error fetching rules:', error.message);
}
```

## Xử lý lỗi

SDK sử dụng các error classes để phân loại lỗi:

```javascript
import Waterbase, { 
  ValidationError, 
  NetworkError, 
  AuthenticationError 
} from 'waterbase-sdk';

try {
  await waterbase.auth.signIn({ email: 'test@test.com', password: '123' });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation error:', error.message);
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
  } else if (error instanceof AuthenticationError) {
    console.error('Auth error:', error.message);
  } else {
    console.error('Unknown error:', error.message);
  }
}
```

## Debug Mode

Bật debug mode để xem chi tiết các request:

```javascript
const waterbase = new Waterbase({
  debug: true
});

// Hoặc trong waterbase-service.json:
{
  "apiUrl": "http://api.waterbase.click",
  "appId": "your-app-id",
  "apiKey": "your-api-key",
  "debug": true
}
```

## Best Practices

1. **Sử dụng waterbase-service.json**: Dễ quản lý và cập nhật config
2. **Xử lý lỗi đầy đủ**: Luôn wrap các API calls trong try-catch
3. **Cleanup realtime listeners**: Nhớ gọi `off()` và `disconnect()` khi component unmount
4. **Bảo mật API key**: Không commit waterbase-service.json vào git (thêm vào .gitignore)
5. **Token management**: SDK tự động quản lý token, không cần xử lý thủ công

## Ví dụ hoàn chỉnh

Xem demo app tại: `demo-chat-react/` để có ví dụ hoàn chỉnh về cách sử dụng Waterbase SDK.

## Hỗ trợ

- GitHub: [Waterbase Repository]
- Email: support@waterbase.click
- Documentation: http://docs.waterbase.click
