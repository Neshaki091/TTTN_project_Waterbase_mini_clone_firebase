# Waterbase Logo - Hướng Dẫn Sử Dụng

## 📦 Files Đã Tạo

### 1. **WaterDropLogo Component** (`src/components/common/WaterDropLogo.jsx`)
Component React SVG có thể tái sử dụng cho logo giọt nước Waterbase.

**Props:**
- `size` (number, default: 32) - Kích thước logo (width & height)
- `className` (string, default: "") - CSS classes tùy chỉnh

**Sử dụng:**
```jsx
import WaterDropLogo from '../components/common/WaterDropLogo';

// Basic usage
<WaterDropLogo />

// Custom size
<WaterDropLogo size={48} />

// With custom classes
<WaterDropLogo size={32} className="hover:opacity-80 transition-opacity" />
```

### 2. **Favicon** (`public/favicon.svg`)
Logo SVG cho browser tab icon.

## 🎨 Thiết Kế Logo

### Màu Sắc
- **Gradient chính:**
  - Top: `#60A5FA` (Blue 400)
  - Middle: `#3B82F6` (Blue 500)
  - Bottom: `#2563EB` (Blue 600)

- **Stroke gradient:**
  - Top: `#93C5FD` (Blue 300)
  - Bottom: `#1D4ED8` (Blue 700)

### Đặc Điểm
- ✨ Hiệu ứng shine/highlight màu trắng (opacity 30%)
- 💧 Bong bóng nhỏ trang trí (opacity 50%)
- 🎨 Gradient mượt mà từ xanh nhạt đến xanh đậm
- 🔵 Viền gradient tạo chiều sâu

## 📍 Vị Trí Sử Dụng

### ✅ Đã Tích Hợp

1. **Header Component** (`src/components/layout/Header.jsx`)
   - Vị trí: Bên trái header, trước text "Waterbase Console"
   - Kích thước: 28px
   - Hiển thị: Tất cả các trang sau khi đăng nhập

2. **Login Page** (`src/pages/Login.jsx`)
   - Vị trí: Trung tâm, phía trên tiêu đề
   - Kích thước: 48px
   - Hiển thị: Trang đăng nhập/đăng ký

3. **Favicon** (`index.html`)
   - Browser tab icon
   - Kích thước: 32x32px

## 🔧 Tùy Chỉnh

### Thay Đổi Màu Sắc

Mở file `WaterDropLogo.jsx` và chỉnh sửa gradient:

```jsx
<linearGradient id="waterGradient" ...>
  <stop offset="0%" stopColor="#YOUR_COLOR_1" />
  <stop offset="50%" stopColor="#YOUR_COLOR_2" />
  <stop offset="100%" stopColor="#YOUR_COLOR_3" />
</linearGradient>
```

### Thay Đổi Kích Thước Mặc Định

```jsx
const WaterDropLogo = ({ size = 40, className = "" }) => {
  // size mặc định là 40 thay vì 32
```

### Thêm Animation

```jsx
<WaterDropLogo 
  size={32} 
  className="animate-pulse hover:scale-110 transition-transform" 
/>
```

## 🚀 Sử Dụng Ở Các Component Khác

### Dashboard
```jsx
import WaterDropLogo from '../components/common/WaterDropLogo';

<div className="flex items-center space-x-2">
  <WaterDropLogo size={24} />
  <h2>Dashboard</h2>
</div>
```

### Loading State
```jsx
<div className="flex flex-col items-center justify-center">
  <WaterDropLogo size={64} className="animate-bounce" />
  <p>Đang tải...</p>
</div>
```

### Empty State
```jsx
<div className="text-center">
  <WaterDropLogo size={80} className="opacity-50 mx-auto mb-4" />
  <p>Chưa có dữ liệu</p>
</div>
```

## 📊 Kích Thước Khuyến Nghị

| Vị trí | Kích thước | Ghi chú |
|--------|-----------|---------|
| Header | 24-32px | Nhỏ gọn, không chiếm nhiều không gian |
| Login/Landing | 48-64px | Nổi bật, thu hút sự chú ý |
| Dashboard Card | 32-40px | Vừa phải, cân đối |
| Loading Spinner | 48-80px | Lớn, dễ nhìn thấy |
| Favicon | 32x32px | Chuẩn browser |
| Mobile | 20-28px | Nhỏ hơn cho màn hình nhỏ |

## 🎯 Best Practices

1. **Consistency**: Sử dụng cùng một component `WaterDropLogo` thay vì tạo nhiều phiên bản khác nhau
2. **Accessibility**: Thêm `aria-label` khi cần thiết
3. **Performance**: SVG inline tốt hơn image file cho logo đơn giản
4. **Responsive**: Điều chỉnh size theo breakpoint nếu cần

## 🔍 Preview

Logo đã được tạo với thiết kế hiện đại, chuyên nghiệp, phù hợp với thương hiệu Waterbase BaaS platform.

**Đặc điểm nổi bật:**
- 💎 Gradient xanh dương tươi sáng
- ✨ Hiệu ứng ánh sáng tự nhiên
- 🎨 Thiết kế tối giản, dễ nhận diện
- 📱 Responsive và scalable (SVG)
