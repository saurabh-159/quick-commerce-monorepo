# Dockerfile for socket-service (Node.js + Socket.io + Redis)
# Placeholder — image steps will be added later.
# Step 1: Base Image (Node.js lightweight alpine version)
FROM node:18-alpine

# Step 2: Working Directory set karna
WORKDIR /app

# Step 3: Package files copy karna
COPY package*.json ./

# Step 4: Dependencies install karna (Production ke liye)
RUN npm ci --only=production

# Step 5: Baaki code copy karna
COPY . .

# Step 6: Socket service ka port (jaise 5000) expose karna
EXPOSE 5000

# Step 7: Server start command
CMD ["npm", "start"]