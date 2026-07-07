FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your frontend code
COPY . .

# Build the Next.js application for production
RUN npm run build

EXPOSE 3000

# Start the application in production mode
CMD ["npm", "run", "start"]