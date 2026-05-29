FROM node:20-alpine AS builder

WORKDIR /app

COPY apps/frontend/package.json /app/package.json
COPY apps/frontend/tsconfig.json /app/tsconfig.json
COPY apps/frontend/tsconfig.node.json /app/tsconfig.node.json
COPY apps/frontend/vite.config.ts /app/vite.config.ts
COPY apps/frontend/index.html /app/index.html
COPY apps/frontend/src /app/src

RUN npm install
RUN npm run build

FROM nginx:1.27-alpine

COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
