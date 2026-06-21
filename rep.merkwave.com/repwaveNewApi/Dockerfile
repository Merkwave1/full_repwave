FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose Vite dev server port
EXPOSE 5174

# Start Vite dev server
# --host 0.0.0.0 allows external connections
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5174"]
