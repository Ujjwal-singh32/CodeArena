FROM node:20-alpine

RUN apk add --no-cache docker-cli

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
CMD ["npm", "run", "dev"]
