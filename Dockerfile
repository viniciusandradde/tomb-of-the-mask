FROM node:22-alpine
WORKDIR /app
COPY server.js package.json ./
COPY pwa ./pwa
EXPOSE 8080
CMD ["node", "server.js", "8080"]
