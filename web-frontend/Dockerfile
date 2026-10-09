# Dockerfile for web-frontend (Next.js)
# Placeholder — image steps will be added later.
# Step 1: Base image
FROM node:18-alpine AS builder
WORKDIR /app

# Step 2: Dependencies install karna
COPY package*.json ./
RUN npm ci

# Step 3: Saara code copy karke production build banana
COPY . .
RUN npm run build

# Step 4: Production ke liye lightweight runner stage banana (Image size chota rakhne ke liye)
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Step 5: Sirf zaroori build files builder stage se copy karna
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Step 6: Port 3000 expose karna
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Step 7: Next.js server start karna
CMD ["node", "server.js"]