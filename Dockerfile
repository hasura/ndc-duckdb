# Use Node.js 20 as the base image for both build and production stages
FROM node:20 AS build-stage

# Set the working directory inside the container for the build stage
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available) to the working directory
COPY package*.json ./

# Install both production and development dependencies
RUN npm install

# Install TypeScript globally
RUN npm install -g typescript

# Copy the entire project
COPY . .

# Compile TypeScript to JavaScript
RUN tsc

# Start a new stage for the production environment
FROM node:20 AS production

# Set working directory for the production stage
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy compiled JavaScript from the build stage
COPY --from=build-stage /usr/src/app/dist ./dist

# Define the environment variable for configuration directory with a default value, which can be overridden
ENV HASURA_CONFIGURATION_DIRECTORY=/etc/connector

# Set the default port environment variable and allow it to be overridden
ENV HASURA_CONNECTOR_PORT=8080

# Expose the port specified by the HASURA_CONNECTOR_PORT environment variable
EXPOSE $HASURA_CONNECTOR_PORT

# Copy the entrypoint script into the container and make it executable
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Use the entrypoint script to handle startup and signal trapping
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]