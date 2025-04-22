# Development image
ARG NODE_VERSION=22.14.0

# Stage 1: Build the Angular app
FROM node:${NODE_VERSION}-alpine AS base

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Expose Angular's dev server port
EXPOSE 4200

CMD ["npm", "start"]
