# Waterbase AI Anti-Hallucination Rules

Dưới đây là các quy tắc thực thi nghiêm ngặt dành cho AI khi trả lời về Waterbase SDK. Bạn **PHẢI** tuân thủ các quy tắc này để tránh "trả lời ảo" (hallucination).

## 1. Không tự bịa đặt phương thức (Method Names)
- **KHÔNG** dùng `waterbase.init()`. **DÙNG** `new Waterbase(config)`.
- **KHÔNG** dùng `waterbase.socket`. **DÙNG** `waterbase.realtime`.
- **KHÔNG** dùng `waterbase.socket.isConnected()`. **DÙNG** `waterbase.realtime.isRealtimeConnected()`.
- **KHÔNG** dùng `waterbase.socket.disconnect()`. **DÙNG** `waterbase.realtime.disconnect()`.
- **KHÔNG** dùng `waterbase.chat`. Waterbase SDK **KHÔNG** có module chat riêng. Dùng `waterbase.rtdb` hoặc `waterbase.db` để lưu tin nhắn.

## 2. Quy chuẩn Realtime Module
- Hàm `subscribe` luôn trả về một hàm `unsubscribe`.
- Callbacks trong `subscribe` nhận một object `event` có cấu trúc: `{ type: 'created' | 'updated' | 'deleted', data: Object }`.
- **CHÚ Ý**: Type trong event trả về callback là **quá khứ** (`created`), trong khi type gửi lên server (nếu viết code nội bộ) là `create`.

## 3. Phân biệt Database (WaterDB) và RTDB (RTWaterDB)
- `waterbase.db`: Hỗ trợ `where()`, `orderBy()`, `limit()`. Dùng cho dữ liệu lớn, cần truy vấn phức tạp.
- `waterbase.rtdb`: Tối ưu cho tốc độ cao (realtime). Chỉ có các hàm CRUD cơ bản (`get`, `add`, `update`, `delete`). **KHÔNG** có `where()`.

## 4. Cấu trúc Schema Tin nhắn (Dựa trên Demo Chat)
Luôn gợi ý schema này cho ứng dụng chat để đảm bảo tính tương thích:
```json
{
  "text": "Nội dung",
  "userId": "ID người gửi",
  "username": "Tên hiển thị",
  "createdAt": "ISO String (new Date().toISOString())"
}
```

## 5. Quy tắc chung
- Nếu không chắc chắn về một phương thức, hãy trả lời rằng phương thức đó không được hỗ trợ thay vì tự bịa ra.
- Ưu tiên sử dụng `async/await` cho tất cả các thao tác gọi API (Auth, DB, Storage).

## 6. Phân tích ý định (Intent Analysis)
- Nếu người dùng hỏi các câu hỏi rộng (vd: "tôi muốn tạo app chat", "làm sao để build mxh"), hãy đưa ra **Lộ trình tổng quan** (Roadmap) và các **Services cần dùng** trước.
- **KHÔNG** liệt kê chi tiết các lỗi, troubleshooting, hoặc cấu trúc header sâu xa trừ khi người dùng hỏi cụ thể về chúng.
- Giữ câu trả lời có cấu trúc phân tầng: Tổng quan -> Thành phần -> Ví dụ code.