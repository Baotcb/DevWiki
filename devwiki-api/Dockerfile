FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

RUN npm run build \
    && npm prune --omit=dev \
    && npm cache clean --force

RUN addgroup -S appgroup \
    && adduser -S appuser -G appgroup \
    && mkdir -p /app/uploads \
    && chown -R appuser:appgroup /app/uploads \
    && chmod -R 770 /app/uploads

USER appuser
EXPOSE 3000
CMD ["node", "dist/main"]