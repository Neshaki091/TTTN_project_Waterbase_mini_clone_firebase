FROM node:18-alpine

WORKDIR /app

# Copy shared dependencies first
COPY services/shared ./shared

# Copy analytics service
COPY services/analytics-service/package*.json ./
RUN npm install --production

COPY services/analytics-service .

EXPOSE 3006

CMD ["node", "server.js"]
