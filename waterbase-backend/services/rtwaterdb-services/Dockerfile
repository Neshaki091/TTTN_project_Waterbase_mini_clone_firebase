FROM node:20-alpine

WORKDIR /app

COPY services/rtwaterdb-services/package*.json ./
RUN npm install --production
COPY services/shared ./shared
COPY services/rtwaterdb-services/. .

EXPOSE 3005

CMD ["node", "server.js"]

