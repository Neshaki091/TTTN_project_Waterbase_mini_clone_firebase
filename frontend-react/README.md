# Waterbase Frontend - React

Frontend console application cho Waterbase backend microservices.

## Cấu trúc API

Frontend này kết nối với backend thông qua NGINX API Gateway tại `http://localhost` (port 80).

### API Endpoints

Tất cả các requests đều đi qua NGINX gateway với cấu trúc:

```
Frontend → NGINX (localhost:80) → Backend Services
```

#### Auth Service (port 3000)
- `POST /auth/owners/login` - Đăng nhập owner
- `POST /auth/owners/logout` - Đăng xuất owner
- `POST /auth/owners` - Đăng ký owner mới
- `GET /auth/owners/:id` - Lấy thông tin owner

#### App Service (port 3001)
- `GET /apps/` - Lấy danh sách apps
- `GET /apps/:id` - Lấy thông tin app
- `POST /apps/` - Tạo app mới
- `PUT /apps/:id` - Cập nhật app
- `DELETE /apps/:id` - Xóa app
- `GET /apps/:id/api-key` - Lấy API key
- `POST /apps/:id/regenerate-key` - Tạo lại API key

#### Database Service (port 3002)
- `GET /db/collections` - Lấy danh sách collections
- `GET /db/:collectionName` - Lấy documents trong collection
- `GET /db/:collectionName/:docId` - Lấy document cụ thể
- `POST /db/:collectionName` - Tạo document mới
- `PUT /db/:collectionName/:docId` - Cập nhật document
- `DELETE /db/:collectionName/:docId` - Xóa document

#### Rule Service (port 3004)
- `GET /rules/:appId/:role` - Lấy rule theo app và role
- `POST /rules/` - Tạo rule mới
- `PUT /rules/` - Cập nhật rule
- `DELETE /rules/:appId/:role` - Xóa rule
- `POST /rules/check-action` - Kiểm tra action

## Cài đặt

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình môi trường

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Nội dung file `.env`:

```env
VITE_API_BASE_URL=http://localhost
```

### 3. Chạy development server

```bash
npm run dev
```

Frontend sẽ chạy tại `http://localhost:5173` (hoặc port khác nếu 5173 đang được sử dụng).

## Cấu trúc thư mục

```
src/
├── components/       # React components
│   ├── common/      # Shared components (Button, Input, etc.)
│   └── ...
├── config/          # Configuration files
│   └── api.config.js    # API endpoints configuration
├── context/         # React Context
│   └── AppContext.jsx   # Global app state
├── pages/           # Page components
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   └── AppDetail.jsx
├── services/        # API service layer
│   ├── api.client.js    # Axios client setup
│   ├── auth.service.js  # Auth API calls
│   ├── app.service.js   # App API calls
│   ├── database.service.js  # Database API calls
│   └── rule.service.js  # Rule API calls
├── App.jsx          # Main app component
└── main.jsx         # Entry point
```

## Authentication Flow

1. **Login**: User nhập email/password → POST `/auth/owners/login`
2. **Token Storage**: JWT token được lưu trong `localStorage` với key `ownerToken`
3. **Authenticated Requests**: Mọi request đến App/Database/Rule services đều gửi kèm header:
   ```
   Authorization: Bearer <ownerToken>
   ```
4. **Logout**: POST `/auth/owners/logout` → Xóa token khỏi localStorage

## API Client Architecture

### Management API
Dùng cho Owner operations (quản lý apps, rules):
- Base URL: `/apps`, `/rules`
- Authentication: `Authorization: Bearer <ownerToken>`

### Usage API
Dùng cho End-User operations (CRUD database):
- Base URL: `/db`
- Headers:
  - `x-app-id: <appId>` - ID của app đang sử dụng
  - `Authorization: Bearer <userToken>` - Token của end-user (nếu có)

## Chạy cùng Backend

### 1. Khởi động Backend Services

Trong thư mục `waterbase-backend`:

```bash
docker-compose up -d
```

Kiểm tra services đang chạy:

```bash
docker-compose ps
```

### 2. Khởi động Frontend

Trong thư mục `frontend-react`:

```bash
npm run dev
```

### 3. Truy cập ứng dụng

Mở browser tại: `http://localhost:5173`

## Build Production

```bash
npm run build
```

Output sẽ được tạo trong thư mục `dist/`.

## Troubleshooting

### CORS Errors

Nếu gặp lỗi CORS, kiểm tra:
1. NGINX có đang chạy không: `docker ps | grep nginx`
2. NGINX config có đúng không: `waterbase-backend/nginx/nginx.conf`

### 401 Unauthorized

- Kiểm tra token trong localStorage: `localStorage.getItem('ownerToken')`
- Thử đăng nhập lại
- Kiểm tra Auth Service có đang chạy không

### 502 Bad Gateway

Nếu gặp lỗi 502 Bad Gateway khi gọi API:

**Nguyên nhân**: NGINX không thể kết nối đến backend services. Thường xảy ra khi:
1. Backend services chưa khởi động xong khi NGINX start
2. NGINX cache DNS của container names

**Giải pháp**:

```bash
# Restart NGINX container
cd waterbase-backend
docker-compose restart nginx
```

Hoặc restart toàn bộ stack:

```bash
docker-compose down
docker-compose up -d
```

**Kiểm tra**:
```bash
# Test API endpoint
Invoke-WebRequest -Uri "http://localhost/auth/owners/login" -Method POST -ContentType "application/json" -Body '{"email":"test@test.com","password":"test"}' -UseBasicParsing

# Nếu thành công, sẽ thấy response (có thể là error "Owner not found" nhưng không phải 502)
```

### Connection Refused

- Đảm bảo backend services đã khởi động: `docker-compose ps`
- Kiểm tra NGINX đang listen port 80: `netstat -an | grep :80`

## Scripts

- `npm run dev` - Chạy development server
- `npm run build` - Build production
- `npm run preview` - Preview production build
- `npm run lint` - Chạy ESLint

## Technologies

- **React 19** - UI framework
- **Vite** - Build tool
- **React Router** - Routing
- **Axios** - HTTP client
- **React Toastify** - Toast notifications
- **Tailwind CSS** - Styling (via CDN in index.html)
