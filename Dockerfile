FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

COPY src ./src

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "src/index.js"]
