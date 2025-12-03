FROM node:18-alpine
WORKDIR /app

# 1. Copy package.json từ đúng đường dẫn thư mục con
COPY services/storage-services/package*.json ./

RUN npm install

# 2. Copy thư mục shared từ gốc (nếu cần dùng middleware/utils chung)
COPY services/shared ./shared

# 3. Copy source code chỉ của service này
COPY services/storage-services .

EXPOSE 3003

CMD ["node", "server.js"]