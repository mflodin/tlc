# Runs the app with its SQLite database in /data. On Dokku, mount a persistent volume there:
#
#   dokku storage:create tlc --chown heroku   # 1000:1000, the image's "node" user
#   dokku storage:mount tlc tlc --container-dir /data
#   dokku config:set tlc SESSION_SECRET=$(openssl rand -hex 32)
#
# Deploy with: git push dokku main
#
# Create the first user with: dokku run tlc npm run user -- add <name> --role editor
FROM node:24-alpine

WORKDIR /app
ENV NODE_ENV=production \
    PORT=5000 \
    DATABASE_PATH=/data/tlc.sqlite \
    TRUST_PROXY=1

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY . .
RUN mkdir -p /data && chown node:node /data

USER node
EXPOSE 5000
VOLUME /data

# node directly rather than npm, so SIGTERM reaches the server for a clean shutdown.
CMD ["node", "--import", "remix/node-tsx", "server.ts"]
