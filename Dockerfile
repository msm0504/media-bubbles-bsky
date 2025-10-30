# Stage 1: Build the TypeScript application
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the TypeScript application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Stage 2: Create the final production image
FROM node:22-alpine

WORKDIR /app

# Copy only the necessary files from the builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Command to run the application
# Ensure dotenv is configured in your main application file (e.g., app.ts or index.ts)
# For example, in app.ts: import 'dotenv/config';
CMD ["npm", "start"]