FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . .

RUN mkdir -p /opt/admin/logs && \
    touch /opt/admin/logs/access.log && \
    touch /opt/admin/logs/error.log && \
    chmod 777 /opt/admin/logs

EXPOSE 3075

CMD ["node", "index.js"]
