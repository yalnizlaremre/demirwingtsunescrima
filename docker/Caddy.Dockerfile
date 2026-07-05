FROM node:20-alpine AS build-app
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
RUN npm run build

FROM node:20-alpine AS build-public
WORKDIR /app
COPY frontend-public/package.json frontend-public/package-lock.json* ./
RUN npm install
COPY frontend-public/ .
RUN npm run build

FROM caddy:2-alpine
COPY --from=build-app /app/dist /srv/app
COPY --from=build-public /app/dist /srv/public
COPY Caddyfile /etc/caddy/Caddyfile
