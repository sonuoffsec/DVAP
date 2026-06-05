# syntax=docker/dockerfile:1
FROM node:20-alpine AS base

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app


FROM base AS development

COPY package.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --prefer-offline

EXPOSE 3000
CMD ["npm", "run", "dev"]


FROM base AS builder

COPY package.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --prefer-offline

COPY . .
RUN npm run build


FROM base AS production

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
