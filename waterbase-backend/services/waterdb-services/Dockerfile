FROM node:20-alpine

WORKDIR /usr/src/app

COPY services/waterdb-services/package*.json ./
RUN npm install --production

COPY services/shared ./shared

COPY services/waterdb-services/. .

EXPOSE 3002

CMD ["npm", "start"]

