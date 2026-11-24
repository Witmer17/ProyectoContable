# Etapa 1: Build de la aplicación Angular
FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration production

# Etapa 2: Servidor Web Nginx ligero para servir la SPA
FROM nginx:alpine

COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# Configuración Nginx para soporte de rutas Angular (HTML5 pushState)
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    location /api/ { \
        proxy_pass http://backend:3000; \
        proxy_set_header Host $host; \
        client_max_body_size 20m; \
    } \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
