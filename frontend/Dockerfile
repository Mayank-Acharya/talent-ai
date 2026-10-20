# ==========================================
# Stage 1: Build React Production Static Bundle
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies cleanly
RUN npm install

# Copy entire frontend source code
COPY . .

# Compile React + TypeScript + Tailwind into optimized static bundle (dist/)
RUN npm run build

# ==========================================
# Stage 2: Serve via Ultra-Fast Nginx
# ==========================================
FROM nginx:alpine AS runner

# Remove default boilerplate configuration
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom Nginx proxy & SPA config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
