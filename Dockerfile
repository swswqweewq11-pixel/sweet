FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm i --omit=dev
COPY src ./src
ENV PORT=3000
ENV CACHE_TTL=300
EXPOSE 3000
CMD ["node", "src/index.js"]
