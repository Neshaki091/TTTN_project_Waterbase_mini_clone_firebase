<div align="center">

![Waterbase Logo](./public/favicon.svg)

# 💧 Waterbase Admin Console

**React Frontend cho Waterbase BaaS Platform**

[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC.svg)](https://tailwindcss.com/)

**Console quản lý cho Waterbase Backend-as-a-Service**

[🌐 Live Demo](https://web.waterbase.click) | [🔗 API](https://api.waterbase.click)

</div>

---

## 📋 Mục Lục

- [Giới Thiệu](#-giới-thiệu)
- [Tính Năng](#-tính-năng)
- [Kiến Trúc](#-kiến-trúc)
- [Công Nghệ](#-công-nghệ)
- [Cài Đặt](#-cài-đặt)
- [Sử Dụng](#-sử-dụng)
- [API Integration](#-api-integration)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)

---

## 🌟 Giới Thiệu

**Waterbase Admin Console** là giao diện quản lý web-based cho nền tảng Waterbase BaaS, được xây dựng bằng React và Vite. Console cung cấp đầy đủ công cụ để developers quản lý ứng dụng, dữ liệu, storage và security rules.

### 🎯 Mục Đích

- ✅ **Owner Dashboard**: Quản lý apps, xem analytics, cấu hình
- ✅ **Data Playground**: CRUD dữ liệu trực quan như Firebase Console
- ✅ **Realtime Playground**: Test realtime sync với WebSocket
- ✅ **Rule Editor**: Soạn thảo JSON security rules
- ✅ **Storage Manager**: Upload/download/delete files
- ✅ **Admin Dashboard**: Quản trị hệ thống (Super Admin)

---

## 🚀 Tính Năng

### 🔐 1. Authentication
- ✅ Đăng ký/Đăng nhập Owner
- ✅ JWT-based authentication
- ✅ Auto-redirect based on role (Owner/Admin)
- ✅ Persistent login với localStorage

### 📱 2. App Management
- ✅ Tạo ứng dụng mới
- ✅ Xem danh sách apps
- ✅ Xem chi tiết app (API Key, App ID)
- ✅ Regenerate API Key
- ✅ Download SDK configuration
- ✅ Xóa ứng dụng

### 📊 3. Overview Dashboard
- ✅ Thống kê tổng quan (Database, Storage, Realtime)
- ✅ Charts với Recharts
- ✅ Real-time usage tracking
- ✅ Quota monitoring

### 🗄️ 4. Data Playground
- ✅ **3-column layout:**
  - Collections list
  - Documents list
  - Document editor
- ✅ **CRUD Operations:**
  - Create collection
  - Create document
  - Edit document (JSON editor)
  - Delete document
  - Delete collection
- ✅ **Query & Filter:**
  - Search documents
  - Sort by fields
  - Pagination

### ⚡ 5. Realtime Playground
- ✅ WebSocket connection status
- ✅ Subscribe/Unsubscribe collections
- ✅ Real-time event monitoring
- ✅ Live data sync visualization
- ✅ Connection management

### 🔒 6. Rule Editor
- ✅ JSON-based rule editor
- ✅ Syntax highlighting
- ✅ Validation
- ✅ Save/Update rules
- ✅ Rule templates

### 📦 7. Storage Manager
- ✅ Upload files (drag & drop)
- ✅ File list với preview
- ✅ Download files
- ✅ Delete files
- ✅ File metadata (size, type, date)
- ✅ Storage quota tracking

### ⚙️ 8. Settings
- ✅ Update app info (name, description)
- ✅ Download SDK config file
- ✅ Regenerate API Key
- ✅ Delete app (với confirmation)

### 👨‍💼 9. Admin Dashboard (Super Admin)
- ✅ Quản lý tất cả Owners
- ✅ Quản lý tất cả Apps
- ✅ System-wide analytics
- ✅ Charts & visualizations
- ✅ Owner/App statistics

### 📖 10. Documentation
- ✅ Hướng dẫn sử dụng SDK
- ✅ Code examples
- ✅ API documentation
- ✅ SDK download

---

## 🏗️ Kiến Trúc

### Component Structure

```
src/
├── components/
│   ├── common/              # Shared components
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Card.jsx
│   │   └── WaterDropLogo.jsx  # Logo component
│   ├── layout/              # Layout components
│   │   └── Header.jsx
│   └── app/                 # App-specific components
│       ├── OverviewTab.jsx
│       ├── DataPlaygroundTab.jsx
│       ├── RealtimePlaygroundTab.jsx
│       ├── RuleEditorTab.jsx
│       ├── StorageTab.jsx
│       └── AppSettings.jsx
├── pages/                   # Page components
│   ├── Login.jsx           # Login/Register page
│   ├── Dashboard.jsx       # Owner dashboard
│   ├── AppDetail.jsx       # App detail page
│   ├── AdminDashboard.jsx  # Admin dashboard
│   ├── AdminOwners.jsx     # Manage owners
│   ├── AdminApps.jsx       # Manage all apps
│   ├── Guide.jsx           # SDK guide
│   └── SDKDownload.jsx     # SDK download
├── services/                # API service layer
│   ├── api.client.js       # Axios client
│   ├── auth.service.js     # Auth APIs
│   ├── app.service.js      # App APIs
│   ├── database.service.js # Database APIs
│   ├── storage.service.js  # Storage APIs
│   ├── rule.service.js     # Rule APIs
│   └── admin.service.js    # Admin APIs
├── context/                 # React Context
│   └── AppContext.jsx      # Global state
├── config/                  # Configuration
│   └── api.config.js       # API endpoints
├── App.jsx                  # Main app
└── main.jsx                 # Entry point
```

### Data Flow

```
User Action → Component → Service Layer → API Client → Backend API
                                                            ↓
                                                       Response
                                                            ↓
Component ← Context (if needed) ← Service Layer ← API Client
```

---

## 🛠️ Công Nghệ

### Core
- **React 18.x** - UI framework
- **Vite 5.x** - Build tool & dev server
- **React Router DOM** - Client-side routing

### UI & Styling
- **TailwindCSS** - Utility-first CSS (via CDN)
- **React Icons** - Icon library
- **Recharts** - Charts & visualizations

### Data & State
- **React Context** - Global state management
- **Axios** - HTTP client
- **Socket.io Client** - WebSocket for realtime

### Utilities
- **React Toastify** - Toast notifications
- **date-fns** - Date formatting

---

## 📦 Cài Đặt

### Yêu Cầu

- **Node.js:** 18.x+
- **npm:** 9.x+
- **Backend:** Waterbase backend services đang chạy

### Bước 1: Clone & Install

```bash
# Navigate to frontend directory
cd waterbase/frontend-react

# Install dependencies
npm install
```

### Bước 2: Cấu Hình Environment

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

**File `.env`:**

```env
# Local Development
VITE_API_BASE_URL=http://localhost

# Production
# VITE_API_BASE_URL=https://api.waterbase.click
```

### Bước 3: Khởi Động Dev Server

```bash
npm run dev
```

Frontend sẽ chạy tại: **http://localhost:5173**

---

## 💻 Sử Dụng

### 1️⃣ Đăng Nhập

**Local:**
1. Truy cập http://localhost:5173
2. Đăng nhập hoặc đăng ký tài khoản Owner

**Production:**
1. Truy cập https://web.waterbase.click
2. Đăng nhập với tài khoản của bạn

### 2️⃣ Tạo App

1. Click "Tạo ứng dụng mới"
2. Điền tên và mô tả
3. Hệ thống tự động sinh App ID và API Key

### 3️⃣ Quản Lý Dữ Liệu

**Data Playground:**
- Click vào app → Tab "Data"
- Tạo collection mới
- Thêm documents
- Edit/Delete documents

### 4️⃣ Test Realtime

**Realtime Playground:**
- Tab "Realtime"
- Click "Connect" để kết nối WebSocket
- Subscribe collection để nhận events
- Mở tab khác và thay đổi data để xem sync

### 5️⃣ Cấu Hình Security

**Rule Editor:**
- Tab "Rules"
- Chỉnh sửa JSON rules
- Click "Save Rules"

**Example:**
```json
{
  "database": {
    "users": {
      "read": true,
      "write": "auth.uid != null"
    }
  }
}
```

### 6️⃣ Quản Lý Files

**Storage:**
- Tab "Storage"
- Drag & drop files để upload
- Click file để download
- Delete files không cần thiết

---

## 🔌 API Integration

### Authentication Flow

```javascript
// 1. Login
POST /api/v1/auth/owners/login
Body: { email, password }
Response: { token, owner }

// 2. Store token
localStorage.setItem('ownerToken', token);

// 3. Authenticated requests
Headers: {
  'Authorization': 'Bearer <ownerToken>'
}
```

### API Endpoints

**Auth Service:**
```
POST   /api/v1/auth/owners/register
POST   /api/v1/auth/owners/login
POST   /api/v1/auth/owners/logout
GET    /api/v1/auth/owners/me
```

**App Service:**
```
GET    /api/v1/apps
POST   /api/v1/apps
GET    /api/v1/apps/:appId
PUT    /api/v1/apps/:appId
DELETE /api/v1/apps/:appId
POST   /api/v1/apps/:appId/regenerate-key
```

**Database Service:**
```
GET    /api/v1/db/collections
POST   /api/v1/db/:collection
GET    /api/v1/db/:collection
PUT    /api/v1/db/:collection/:id
DELETE /api/v1/db/:collection/:id
```

**Storage Service:**
```
POST   /api/v1/storage/upload
GET    /api/v1/storage/files
GET    /api/v1/storage/file/:fileId
DELETE /api/v1/storage/file/:fileId
```

**Realtime (WebSocket):**
```
ws://localhost/api/v1/rtdb          (Local)
wss://api.waterbase.click/api/v1/rtdb  (Production)
```

### Service Layer Example

```javascript
// services/app.service.js
import apiClient from './api.client';

export const appService = {
  getApps: async () => {
    const response = await apiClient.get('/apps');
    return response.data;
  },
  
  createApp: async (appData) => {
    const response = await apiClient.post('/apps', appData);
    return response.data;
  }
};
```

---

## 🌐 Deployment

### Build Production

```bash
npm run build
```

Output: `dist/` directory

### Deploy to Server

**Option 1: Static Hosting**
```bash
# Upload dist/ to static host (Netlify, Vercel, etc.)
```

**Option 2: Nginx**
```nginx
server {
    listen 80;
    server_name web.waterbase.click;
    
    root /var/www/waterbase-frontend/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Option 3: Docker**
```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Environment Variables

**Production `.env`:**
```env
VITE_API_BASE_URL=https://api.waterbase.click
```

---

## 🔧 Troubleshooting

### CORS Errors

**Nguyên nhân:** Backend không cho phép origin của frontend

**Giải pháp:**
1. Kiểm tra NGINX config
2. Đảm bảo CORS headers được set đúng
3. Restart NGINX: `docker-compose restart nginx`

### 401 Unauthorized

**Nguyên nhân:** Token không hợp lệ hoặc hết hạn

**Giải pháp:**
```javascript
// Check token
console.log(localStorage.getItem('ownerToken'));

// Clear and re-login
localStorage.removeItem('ownerToken');
// Login again
```

### 502 Bad Gateway

**Nguyên nhân:** NGINX không kết nối được backend services

**Giải pháp:**
```bash
# Restart NGINX
cd waterbase-backend
docker-compose restart nginx

# Or restart all
docker-compose down && docker-compose up -d
```

### WebSocket Connection Failed

**Nguyên nhân:** Realtime service không chạy hoặc NGINX config sai

**Giải pháp:**
```bash
# Check realtime service
docker-compose ps rtwaterdb-service

# Check logs
docker-compose logs rtwaterdb-service

# Restart
docker-compose restart rtwaterdb-service
```

### Build Errors

```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf .vite
npm run dev
```

---

## 📜 Scripts

```bash
npm run dev      # Start dev server (port 5173)
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

---

## 🎨 Customization

### Logo

Logo được định nghĩa trong `src/components/common/WaterDropLogo.jsx`

Xem [LOGO_GUIDE.md](./LOGO_GUIDE.md) để biết cách tùy chỉnh.

### Theme Colors

Chỉnh sửa trong các component hoặc thêm vào Tailwind config:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        // ...
      }
    }
  }
}
```

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/your-repo/issues)
- **Documentation:** [Main README](../../README.md)
- **API Docs:** [API Documentation](../../docs/API.md)

---

## 📄 License

MIT License - See [LICENSE](../../LICENSE)

---

<div align="center">

**Made with ❤️ for Waterbase BaaS Platform**

[🌐 Live Demo](https://web.waterbase.click) | [🔗 API](https://api.waterbase.click) | [📖 Docs](../../README.md)

</div>
