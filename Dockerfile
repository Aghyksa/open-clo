FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit
COPY . .
RUN npm run verify

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3001 DATABASE_PATH=/data/openclo.sqlite
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/dist-server ./dist-server
COPY --chown=node:node server/app.mjs server/main.mjs server/cdrImport.mjs server/cdrWorker.mjs ./server/
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/healthz || exit 1
CMD ["node", "server/main.mjs"]
