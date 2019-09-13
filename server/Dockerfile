### BASE ###
FROM node:dubnium-alpine as base

# Set arguments & environment variables
ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV
ARG PORT=8080
ENV PORT $PORT

# Install latest npm version
RUN npm i --global --silent npm@latest

### BUILDER STAGE ###
FROM base as builder

# Install dependencies
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci --production=false --silent
ENV PATH /app/node_modules/.bin:$PATH

# Copy source code
WORKDIR /app/server
COPY ./ ./
# set rights for openshift
RUN chgrp -R 0 /app/ && chmod -R g+rwX /app && chown node:node -R /app

# add user for openshift
USER node

# Build source code
RUN npm run build

### RUN STAGE ###
FROM base as run

# Expose port
EXPOSE 8080

# Install dependencies (production only)
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci --production --silent && npm cache clean --force
ENV PATH /app/node_modules/.bin:$PATH

# Copy built source code
WORKDIR /app
COPY --from=builder /app/server/tsconfig*.json ./
COPY --from=builder /app/server/dist ./

CMD node index.js
