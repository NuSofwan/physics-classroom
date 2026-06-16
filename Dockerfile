# Generic container image — works on Railway, Fly.io, Cloud Run, etc.
FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package*.json ./
RUN npm install

# Build the frontend.
COPY . .
RUN npm run build

ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000

CMD ["npm", "start"]
