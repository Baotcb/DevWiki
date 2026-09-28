FROM node:20-alpine

WORKDIR /app


COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production

RUN apk add --no-cache nginx \
    && mkdir -p /usr/share/nginx/html \
    && cp -R dist/* /usr/share/nginx/html/ \
    && rm -rf /app/node_modules

COPY nginx.conf /etc/nginx/http.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]