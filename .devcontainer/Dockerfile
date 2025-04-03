FROM node:20-slim

# Install basic development tools
RUN apt update && apt install -y --no-install-recommends git curl wget build-essential ca-certificates

# Install PM2 globally as it's used in the project
RUN npm install -g pm2

WORKDIR /workspaces/app

# Install dependencies for all parts of the application
COPY package*.json ./
RUN npm install

# Set up a non-root user
RUN groupadd --gid 1000 node \
    && useradd --uid 1000 --gid node --shell /bin/bash --create-home node

# Give permissions to the node user
RUN chown -R node:node /workspaces

USER node

# Set environment variables
ENV NODE_ENV=development

EXPOSE 3000 3001 3080 3081 