# ── Stage: run Express server ──────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json ./
RUN npm install --omit=dev

# Copy the rest of the app
COPY . .

EXPOSE 3000

CMD ["node", "server/index.js"]
