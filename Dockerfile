FROM node:24.2-alpine AS base

LABEL org.opencontainers.image.licenses="SSPL-1.0"
LABEL org.opencontainers.image.source="https://github.com/galaxy-sspl/mongodb-service"
LABEL org.opencontainers.image.description="Open source MongoDB hosting platform"


RUN apk add --no-cache dumb-init \
    && addgroup -g 1001 -S mongodbservice \
    && adduser -S mongodbservice -u 1001

# All deps stage
FROM base AS deps
WORKDIR /app
ADD package.json package-lock.json ./
RUN npm ci

# Production only deps stage
FROM base AS production-deps
WORKDIR /app
ADD package.json package-lock.json ./
RUN npm ci --omit=dev

# Build stage
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules /app/node_modules
ADD . .
RUN node ace build

# Production stage
FROM base AS production
ENV NODE_ENV=production
WORKDIR /app

# Copy production dependencies and built app
COPY --from=production-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app

RUN chown -R mongodbservice:mongodbservice /app
USER mongodbservice

EXPOSE 3333

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start"]
