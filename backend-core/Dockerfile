# Dockerfile for backend-core (Node.js + Express)
# Placeholder — image steps will be added later.
# 1. Base Image: Node.js ka lightweight Alpine version taaki image choti rahe
FROM node:18-alpine

# 2. Working Directory: Container ke andar /app folder banana
WORKDIR /app

# 3. Dependencies copy karna: Pehle sirf package.json aur package-lock.json copy karte hain (Layer caching ke liye)
COPY package*.json ./

# 4. Install packages: Production ke liye zaroori dependencies install karna (npm ci se exact version install hota hai)
RUN npm ci --only=production

# 5. Source Code copy karna: Baaki ka bacha hua saara code container ke andar dalna
COPY . .

# 6. Expose Port: Batana ki backend app kis port par run karegi (jaise 4000)
EXPOSE 4000

# 7. Start Command: Container start hote hi server ko run karne ki command
CMD ["npm", "start"]