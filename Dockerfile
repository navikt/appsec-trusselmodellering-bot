FROM europe-north1-docker.pkg.dev/cgr-nav/pull-through/nav.no/node:22-dev AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

FROM europe-north1-docker.pkg.dev/cgr-nav/pull-through/nav.no/node:22-dev
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

COPY --from=builder /app/node_modules ./node_modules
COPY --chown=node:node . .

USER node

EXPOSE 3000

ENTRYPOINT ["node"]
CMD ["app.js"]
