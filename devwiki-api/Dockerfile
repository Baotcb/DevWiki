

FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./


RUN npm ci


COPY . .


RUN npm run build


FROM node:20-alpine AS production

WORKDIR /app


COPY package*.json ./


RUN npm ci --omit=dev && npm cache clean --force


COPY --from=builder /app/dist ./dist


RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app/uploads
USER appuser

EXPOSE 3000

CMD ["node", "dist/main"]
