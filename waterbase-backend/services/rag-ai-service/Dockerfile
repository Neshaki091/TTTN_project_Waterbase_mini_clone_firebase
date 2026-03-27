FROM node:20-alpine

WORKDIR /app

# Install system dependencies if needed (for systeminformation)
RUN apk add --no-cache iproute2 bash

# SỬA: Thêm 'services/rag-ai-service/' vào đường dẫn nguồn
COPY services/rag-ai-service/package*.json ./

RUN npm install --production

COPY services/rag-ai-service .

# Ensure vault directory exists
RUN mkdir -p knowlegde-vault

EXPOSE 3007

CMD ["npm", "start"]
