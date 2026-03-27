# Troubleshooting & Common Errors

Tài liệu này tổng hợp các lỗi thường gặp khi sử dụng Waterbase SDK và cách khắc phục.

---

## 1. Lỗi Auth: Mất token hoặc hết hạn phiên đăng nhập
- **Triệu chứng**: Các API trả về lỗi `401 Unauthorized`.
- **Nguyên nhân**: Token hết hạn.
- **Cách xử lý**: 
  - Đảm bảo bắt lỗi (try-catch) khi gọi API.
  - Kiểm tra `waterbase.auth.isAuthenticated()`.

## 2. Lỗi Realtime: Không nhận được tin nhắn mới
- **Triệu chứng**: Tin nhắn đã lưu vào DB nhưng không hiện lên ở client khác.
- **Nguyên nhân**: 
  - Mạng kém làm ngắt socket.
  - Quên gọi `.subscribe()`.
  - Component React re-render làm mất listener.
- **Cách xử lý**:
  - Bật `debug: true` khi khởi tạo SDK để xem lỗi `connect_error`.
  - Kiểm tra xem đã gọi `subscribe` trong `useEffect` và có hàm `cleanup` chưa.

## 3. Lỗi Database/RTDB: Lỗi Validation
- **Triệu chứng**: Lỗi `ValidationError: Document data must be an object`.
- **Nguyên nhân**: Truyền null/undefined vào hàm `.add()`.
- **Cách xử lý**: 
  - Kiểm tra dữ liệu (Payload) trước khi gửi.

## 4. Lỗi Storage: CORS hoặc Dung lượng
- **Triệu chứng**: Upload file thất bại (HTTP 500 hoặc CORS error).
- **Nguyên nhân**: File > 5MB hoặc cấu hình server.
- **Cách xử lý**: 
  - Kiểm tra `file.size` ở client trước khi upload.
  - Cấu hình allow CORS cho domain tương ứng.
