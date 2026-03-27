# 08_application_architectures.md

Tài liệu này cung cấp 20 ví dụ về các loại ứng dụng phổ biến và các dịch vụ Waterbase SDK cần thiết để xây dựng chúng. Điều này giúp người dùng định hình kiến trúc hệ thống nhanh chóng.

---

### 1. Ứng dụng Mạng xã hội (Social Media)
- **Mô tả**: Nền tảng chia sẻ bài viết, hình ảnh và tương tác giữa người dùng.
- **Dịch vụ cần dùng**:
  - `auth`: Quản lý tài khoản, hồ sơ người dùng.
  - `database`: Lưu trữ bài viết, bình luận, lượt thích, mối quan hệ bạn bè.
  - `storage`: Lưu trữ hình ảnh và video tải lên.
  - `realtime`: Thông báo tin nhắn mới, thông báo tương tác (like/comment) thời gian thực.

### 2. Ứng dụng Chat thời gian thực (Real-time Messaging)
- **Mô tả**: Chat 1-1 hoặc chat nhóm với tốc độ cao.
- **Dịch vụ cần dùng**:
  - `auth`: Đăng nhập, quản lý danh bạ.
  - `rtwaterdb`: Lưu trữ tin nhắn (yêu cầu tốc độ đọc/ghi cực nhanh).
  - `realtime`: Lắng nghe tin nhắn mới và trạng thái online/offline.
  - `storage`: Gửi file đính kèm, ảnh, voice message.

### 3. Sàn thương mại điện tử (E-commerce Marketplace)
- **Mô tả**: Mua bán sản phẩm, quản lý đơn hàng.
- **Dịch vụ cần dùng**:
  - `auth`: Tài khoản khách hàng và chủ cửa hàng.
  - `database`: Danh mục sản phẩm, tồn kho, lịch sử đơn hàng, đánh giá.
  - `storage`: Ảnh sản phẩm.
  - `realtime`: Cập nhật trạng thái đơn hàng (đang giao, đã hoàn thành).

### 4. Soạn thảo văn bản cộng tác (Collaborative Editor)
- **Mô tả**: Nhiều người cùng chỉnh sửa một tài liệu cùng lúc (như Google Docs).
- **Dịch vụ cần dùng**:
  - `rtwaterdb`: Lưu trữ nội dung văn bản theo từng đoạn/phiên bản.
  - `realtime`: Đồng bộ hóa con trỏ và thay đổi nội dung giữa các người dùng ngay lập tức.
  - `auth`: Phân quyền xem/sửa cho từng người dùng.

### 5. Quản lý công việc/Dự án (Task-Jira/Trello Clone)
- **Mô tả**: Kéo thả thẻ công việc, quản lý tiến độ.
- **Dịch vụ cần dùng**:
  - `database`: Lưu trữ Project, Board, Card, Checklist.
  - `realtime`: Cập nhật vị trí thẻ cho mọi thành viên trong team khi có người kéo thả.
  - `auth`: Quản lý thành viên tổ chức.

### 6. Blog cá nhân / Portfolio
- **Mô tả**: Trang web tĩnh/động hiển thị bài viết và dự án cá nhân.
- **Dịch vụ cần dùng**:
  - `database`: Lưu trữ bài viết (Markdown), thông tin cá nhân.
  - `storage`: Lưu trữ hình ảnh minh họa bài viết.
  - `auth`: Chỉ dùng cho Admin (chủ blog) để đăng nhập và viết bài.

### 7. Ứng dụng Giao đồ ăn (Food Delivery)
- **Mô tả**: Đặt món, theo dõi tài xế trên bản đồ.
- **Dịch vụ cần dùng**:
  - `auth`: 3 loại tài khoản (Khách, Quán, Tài xế).
  - `database`: Menu nhà hàng, đơn hàng, ví tiền.
  - `rtwaterdb`: Tọa độ GPS của tài xế (thay đổi liên tục).
  - `realtime`: Cập nhật vị trí tài xế trên bản đồ khách hàng.

### 8. Ứng dụng Gọi xe (Ride-Hailing)
- **Mô tả**: Đặt xe, tính cước và thanh toán.
- **Dịch vụ cần dùng**:
  - `auth`: Xác thực số điện thoại.
  - `rtwaterdb`: Vị trí xe trống xung quanh, yêu cầu chuyến đi.
  - `realtime`: Kết nối tài xế và khách hàng khi có yêu cầu.

### 9. Hệ thống học trực tuyến (LMS - Udemy/Coursera)
- **Mô tả**: Video khóa học, bài tập trắc nghiệm.
- **Dịch vụ cần dùng**:
  - `database`: Thông tin khóa học, lộ trình học, điểm số.
  - `storage`: Lưu trữ video bài giảng, tài liệu PDF.
  - `auth`: Quản lý tiến trình học tập của từng học viên.

### 10. Ví điện tử / Fintech App
- **Mô tả**: Chuyển tiền, thanh toán hóa đơn.
- **Dịch vụ cần dùng**:
  - `auth`: Yêu cầu bảo mật cao, OTP.
  - `database`: Lịch sử giao dịch, số dư tài khoản.
  - `realtime`: Thông báo biến động số dư tức thời.
  - `rules`: Quan trọng nhất để kiểm soát logic chuyển tiền giữa các ví.

### 11. Ứng dụng Y tế / Telemedicine
- **Mô tả**: Đặt lịch khám, tư vấn qua video/chat với bác sĩ.
- **Dịch vụ cần dùng**:
  - `auth`: Hồ sơ bệnh án điện tử.
  - `database`: Lịch trực bác sĩ, lịch hẹn.
  - `realtime`: Phòng chờ tư vấn, thông báo tới lượt khám.
  - `storage`: Kết quả xét nghiệm, đơn thuốc (file PDF/Ảnh).

### 12. Theo dõi sức khỏe / Fitness Tracker
- **Mô tả**: Lưu trữ chỉ số tập luyện, calo.
- **Dịch vụ cần dùng**:
  - `database`: Nhật ký tập luyện hàng ngày.
  - `rtwaterdb`: Bước chân, nhịp tim theo thời gian thực từ thiết bị đeo.
  - `auth`: Đồng bộ dữ liệu trên nhiều thiết bị.

### 13. Cổng thông tin Bất động sản
- **Mô tả**: Tìm kiếm nhà đất theo bản đồ, liên hệ chính chủ.
- **Dịch vụ cần dùng**:
  - `database`: Thông tin nhà đất, tọa độ, giá cả.
  - `storage`: Album ảnh thực tế của căn hộ.
  - `realtime`: Chat trực tiếp giữa người mua và môi giới.

### 14. Hệ thống Đặt chỗ sự kiện (Event Booking)
- **Mô tả**: Bán vé liveshow, rạp phim.
- **Dịch vụ cần dùng**:
  - `database`: Thông tin sự kiện, danh sách ghế ngồi.
  - `rtwaterdb`: Giữ chỗ tạm thời (Tránh 2 người đặt cùng 1 ghế).
  - `realtime`: Hiển thị số lượng vé còn lại cập nhật liên tục.

### 15. Diễn đàn cộng đồng (Reddit Clone)
- **Mô tả**: Upvote/Downvote, phân cấp bình luận.
- **Dịch vụ cần dùng**:
  - `database`: Sub-communities, threads, nested comments.
  - `auth`: Karma point, hệ thống huy hiệu.
  - `realtime`: Thông báo khi có phản hồi mới.

### 16. Nền tảng Video Streaming (Youtube Clone)
- **Mô tả**: Upload video, xem trực tuyến, livestream.
- **Dịch vụ cần dùng**:
  - `storage`: Lưu trữ video gốc và các phiên bản nén.
  - `database`: Metadata video (tiêu đề, lượt xem, tags).
  - `realtime`: Chat trực tiếp (Livechat) khi có streaming.

### 17. Dashboard Nhà thông minh (IoT)
- **Mô tả**: Điều khiển đèn, điều hòa, camera.
- **Dịch vụ cần dùng**:
  - `rtwaterdb`: Trạng thái các thiết bị (On/Off, nhiệt độ).
  - `realtime`: Gửi lệnh điều khiển từ App đến thiết bị và nhận phản hồi ngay lập tức.
  - `database`: Lịch sử tiêu thụ điện năng.

### 18. Quản lý quan hệ khách hàng (CRM)
- **Mô tả**: Quản lý Lead, Deal, khách hàng tiềm năng.
- **Dịch vụ cần dùng**:
  - `database`: Danh sách khách hàng, tiến độ chốt hợp đồng.
  - `auth`: Phân cấp Salesman - Manager - Director.
  - `realtime`: Nhắc hẹn gọi điện cho khách hàng.

### 19. Quản lý kho hàng (Inventory Management)
- **Mô tả**: Nhập/Xuất kho, quét mã vạch.
- **Dịch vụ cần dùng**:
  - `database`: Danh mục hàng hóa, số lượng tồn.
  - `realtime`: Cảnh báo khi tồn kho xuống mức thấp.
  - `storage`: Ảnh minh họa sản phẩm, biên bản nhập kho.

### 20. Giao diện Trợ lý AI (RAG Chatbot Interface)
- **Mô tả**: Chat với AI hỗ trợ dựa trên dữ liệu riêng của doanh nghiệp.
- **Dịch vụ cần dùng**:
  - `database`: Lưu trữ lịch sử chat.
  - `realtime`: Hiển thị text theo dạng streaming.
  - `auth`: Giới hạn lượt sử dụng AI cho từng gói tài khoản (Rules).
  - **Dịch vụ Backend (External)**: Tích hợp với `rag-ai-service` của Waterbase.
