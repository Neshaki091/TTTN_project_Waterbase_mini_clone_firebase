# 1. Sử dụng Node.js 18
FROM node:18

WORKDIR /app

# 2. Copy package.json CỤ THỂ của backend từ thư mục gốc
# Cú pháp: COPY <đường_dẫn_từ_root> <đường_dẫn_trong_container>
COPY services/app-services/package*.json ./

# 3. Cài đặt dependencies
RUN npm install

# 4. Copy thư mục shared từ thư mục gốc vào trong container
COPY services/shared ./shared

# 5. Copy toàn bộ code còn lại của backend vào thư mục làm việc hiện tại (/app)
COPY services/app-services .

# 6. Mở cổng
EXPOSE 3001

# 7. Chạy app (Lúc này server.js đã nằm ngay tại /app/server.js nhờ bước 5)
CMD [ "node", "server.js"]