# ==========================================
# Stage 1: Build & Compile TypeScript
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install native dependencies required by Prisma engine on Alpine Linux
RUN apk add --no-cache openssl libc6-compat

# Copy dependency files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Generate Prisma Client specifically for the Alpine Linux runtime
RUN npx prisma generate

# Copy application source code and configuration
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript into JavaScript (dist/ folder)
RUN npm run build

# Prune devDependencies to keep the production image clean and tiny
RUN npm prune --production

# ==========================================
# Stage 2: Production Runtime Image
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Ensure OpenSSL and compatibility libraries are available in runtime
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=5000

# Copy production dependencies and pre-generated Prisma client from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

# Create persistent uploads directory and set permissions
RUN mkdir -p /app/uploads && chown -R node:node /app

# Run as non-root 'node' user for security
USER node

EXPOSE 5000

# Start compiled server
CMD ["node", "dist/index.js"]
