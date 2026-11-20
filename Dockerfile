# Tasks: one container, one data volume.
#   docker build -t tasks .
FROM node:22.22-slim
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY --chown=node:node tsconfig.json tsconfig.build.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node public ./public
RUN npm run build && npm prune --omit=dev --ignore-scripts && npm cache clean --force
ENV HOST=0.0.0.0 PORT=8081 DATA_DIR=/data NODE_ENV=production
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8081) + '/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "dist/main.js"]
