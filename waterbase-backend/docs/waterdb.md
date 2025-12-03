# WaterDB Stack

WaterDB là cụm dịch vụ Mini-Firebase cho Waterbase. Toàn bộ luồng làm việc:

1. **Owner đăng nhập** thông qua `auth-service` (`/api/v1/auth/owners/login`)
2. **Owner tạo App** tại `app-service` (`/api/v1/apps`)
3. Sau khi tạo, Owner sẽ nhận `appId` + `apiKey` và phải truyền `x-app-id` ở mọi request tới WaterDB/Storage/Rule

## Services

| Service | Port | Mục đích | Nginx Route |
|---------|------|---------|-------------|
| `app-service` | 3001 | Quản lý App | `/api/v1/apps/*` |
| `waterdb-service` | 3002 | Firestore-like REST API | `/api/v1/waterdb/*` |
| `rtwaterdb-service` | 3005 | Socket.io realtime layer | `/socket.io` |
| `rule-service` | 3004 | RBAC Rule Engine | `/api/v1/rules/*` |

## WaterDB REST API

Headers tối thiểu:

```
Authorization: Bearer <OwnerToken hoặc UserToken>  # optional cho Playground
X-App-Id: <appId>
Content-Type: application/json
```

Endpoints chính (`/api/v1/waterdb`):

| Method | Path | Mô tả |
|--------|------|------|
| GET | `/collections` | Danh sách collection của app |
| GET | `/:collection` | Trả về documents |
| POST | `/:collection` | Tạo document (tự sinh id nếu không truyền) |
| GET | `/:collection/:docId` | Lấy document |
| PUT | `/:collection/:docId` | Cập nhật document |
| DELETE | `/:collection/:docId` | Xóa document |

Payload mẫu khi tạo document:

```json
POST /api/v1/waterdb/users
{
  "documentId": "user_123",    // optional
  "data": {
    "name": "Jane",
    "email": "jane@example.com"
  }
}
```

Nếu không truyền `data`, WaterDB sẽ dùng phần còn lại của body làm document.

## Realtime (RTWaterDB)

- Socket endpoint: `wss://<host>/socket.io`
- Query bắt buộc: `appId`
- Sự kiện:
  - `subscribe { collection }`
  - `unsubscribe { collection }`
  - `waterdb:event` (server push)

Payload event:

```json
{
  "type": "create|update|delete",
  "collection": "users",
  "documentId": "abc123",
  "data": { ... },
  "timestamp": 1710000000000
}
```

## Rule Engine

Mọi request đi qua WaterDB sẽ gọi Rule Engine với format action `action_collection` (ví dụ: `read_users`). Nếu Rule Engine trả 403 thì frontend cần hiển thị thông báo "Action not allowed".

## Environment

WaterDB service yêu cầu các biến sau:

```
PORT=3002
MONGO_URI=mongodb://mongo:27017/waterdb
JWT_SECRET=supersecret
RULE_ENGINE_URL=http://rule-service:3004
RT_SERVICE_URL=http://rtwaterdb-service:3005/internal/events
INTERNAL_RPC_TOKEN=superinternal
```

RTWaterDB service:

```
PORT=3005
INTERNAL_RPC_TOKEN=superinternal
```

Khi chạy docker compose chỉ cần đặt `INTERNAL_RPC_TOKEN` ở file `.env` nếu muốn thay đổi.


