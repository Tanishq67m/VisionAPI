FROM mcr.microsoft.com/playwright:v1.59.0-jammy

# Create app directory
WORKDIR /app

# Copy root package.json and package-lock.json
COPY package.json package-lock.json ./

# Copy playground package.json
COPY playground/package.json ./playground/

# Install root dependencies
RUN npm ci

# Install playground dependencies
RUN cd playground && npm install

# Copy source code
COPY . .

# Build root TypeScript files
RUN npm run build

# Build playground UI
RUN cd playground && npm run build

# Expose the port the app runs on
EXPOSE 3001

# Command to run the application
CMD ["npm", "run", "playground:server"]
