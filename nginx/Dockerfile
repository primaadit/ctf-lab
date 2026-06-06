FROM nginx:alpine

RUN mkdir -p /opt/admin/logs && \
    chmod 777 /opt/admin/logs

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 3075
