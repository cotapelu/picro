# pi-micro - AI Coding Assistant Docker Image
FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache git

# Copy package files
COPY package*.json ./
COPY packages/*/package*.json ./packages/*/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build all packages
RUN npm run build --workspaces

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S coding-agent -u 1001

USER coding-agent

# Default entrypoint
ENTRYPOINT ["node", "packages/coding-agent/dist/src/main.js"]
CMD ["interactive"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check')" || exit 1

# Expose port if needed for future API mode
EXPOSE 3000

LABEL org.opencontainers.image.title="pi-micro" \
      org.opencontainers.image.description="AI Coding Assistant" \
      org.opencontainers.image.version="0.0.1"
