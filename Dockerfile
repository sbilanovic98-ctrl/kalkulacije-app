FROM node:18-bullseye-slim

WORKDIR /app

# Install build deps for sqlite3 native module
RUN apt-get update && apt-get install -y build-essential python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATA_DIR=/data

VOLUME ["/data"]

EXPOSE 3000
CMD ["node", "server.js"]
