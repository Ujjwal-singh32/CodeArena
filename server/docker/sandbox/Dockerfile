FROM node:20-alpine

RUN apk add --no-cache python3 g++ gcc openjdk17-jdk

WORKDIR /sandbox

# Read-only sandbox — code mounted at runtime
USER node

CMD ["node", "--version"]
