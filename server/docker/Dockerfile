FROM node:20-alpine

ARG DATABASE_URL=postgresql://postgres:postgres@postgres:5432/codearena
ENV DATABASE_URL=$DATABASE_URL

RUN apk add --no-cache docker-cli

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
CMD ["npm", "run", "dev"]
