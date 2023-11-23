# Use Node.js 18 as the base image
FROM node:18 AS build-stage

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if you have one) to the working directory
COPY package*.json ./

# Install both production and development dependencies
RUN npm install

RUN npm install -g typescript

# Copy the entire project
COPY . .

# Compile TypeScript to JavaScript
RUN tsc

# Start a new stage for the production environment
FROM node:18 AS production

WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy compiled JavaScript from the previous stage
COPY --from=build-stage /usr/src/app/dist ./dist

EXPOSE 8100

# Define the command to run the app using CMD
CMD ["node", "./dist/src/index.js", "serve", "--configuration=/etc/connector/config.json"]