# Waterbase SDK - Rules Service (Rules Module)

## Mô tả
Module `rules` cho phép Owner (Admin) quản lý quyền truy cập của các Role khác nhau trong ứng dụng.

## API chính

### 1. `getRules(role)`
- Lấy danh sách các quyền hiện tại của một role (ví dụ: 'user', 'public').

### 2. `updateRules(role, rules)`
- Cập nhật quyền mới cho role.

## Ví dụ cấu trúc Rules
```json
{
  "messages": {
    "read": "true",
    "write": "auth.uid != null"
  }
}
```

## Lưu ý
- Chỉ có Token của **Owner** mới có quyền gọi các hàm trong module này.
- Cần đăng nhập bằng `loginOwner()` trước khi thao tác Rules.
