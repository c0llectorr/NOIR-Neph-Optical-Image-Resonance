# Use the official Node.js image with version 22
FROM node:22-slim AS base

# Set the working directory
WORKDIR /app

# Install build dependencies if needed (e.g., for native npm modules)
# RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Stage 1: Build the application
FROM base AS builder

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the frontend assets
RUN npm run build

# Stage 2: Production runtime
FROM node:22-slim AS runner

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy only the necessary files for production with correct ownership
COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/server.ts ./server.ts
COPY --from=builder --chown=node:node /app/firebase-applet-config.json ./
COPY --from=builder --chown=node:node /app/firebase-blueprint.json ./
COPY --from=builder --chown=node:node /app/.env* ./ 

USER node

# Cloud Run defaults
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
