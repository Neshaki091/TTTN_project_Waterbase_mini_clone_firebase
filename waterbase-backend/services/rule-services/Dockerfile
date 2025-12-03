# 1. Sử dụng Node.js 18
FROM node:18

WORKDIR /app

# 2. Copy package.json TỪ THƯ MỤC GỐC vào container
# Thay 'frontend' bằng tên thư mục thực tế chứa code service này
COPY services/rule-services/package*.json ./

# 3. Cài đặt dependencies
RUN npm install

# 4. Copy thư mục SHARED vào container
# Đây là bước quan trọng để code có thể import từ '../shared'
COPY services/shared ./shared

# 5. Copy toàn bộ code của Service này vào container
# Thay 'frontend' bằng tên thư mục thực tế
COPY services/rule-services .

# 6. Mở cổng 4000
EXPOSE 4000

# 7. Chạy server
CMD [ "node", "server.js"]