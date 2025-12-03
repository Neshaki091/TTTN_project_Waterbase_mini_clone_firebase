FROM node:18
WORKDIR /usr/src/app

# SỬA: Thêm 'services/auth-services/' vào đường dẫn nguồn
COPY services/auth-services/package*.json ./

RUN npm install

# Copy thư mục shared từ gốc
COPY services/shared ./shared

# SỬA: Thêm 'services/auth-services/' vào đường dẫn nguồn
COPY services/auth-services .

EXPOSE 3000
CMD [ "node", "server.js" ]