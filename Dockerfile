FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all source files
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY init-data.js ./

# Seed the SQLite database during build step
RUN node init-data.js

# Railway provides PORT environment variable automatically
# Server must bind to 0.0.0.0 and use process.env.PORT || 3000
EXPOSE 3000

# Start the Express server
CMD ["node", "backend/server.js"]