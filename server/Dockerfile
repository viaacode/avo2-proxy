### BASE ###
FROM node:dubnium-alpine as base

# Set arguments & environment variables
ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV
ARG PORT=8080
ENV PORT $PORT

# Install latest npm version
RUN npm i --global --silent npm@latest
RUN apk --no-cache add curl

### BUILDER STAGE ###
FROM base as builder

# Install dependencies
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm ci --production=false
ENV PATH /app/node_modules/.bin:$PATH

# Copy source code
WORKDIR /app/server
COPY ./ ./

# Build source code
RUN npm run build

### RUN STAGE ###
FROM base as run

# Expose port
EXPOSE 8080

# set rights for openshift
WORKDIR /app
RUN chgrp -R 0 /app/ && chmod -R g+rwX /app && chown node:node -R /app

# add user for openshift
USER node

# Install dependencies (production only)
COPY package*.json .npmrc ./
RUN npm ci --production
RUN npm cache clean --force
ENV PATH /app/node_modules/.bin:$PATH

# Copy built source code
COPY --from=builder /app/server/tsconfig*.json ./
COPY --from=builder /app/server/dist ./

CMD node index.js
