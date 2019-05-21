FROM node:dubnium-alpine

# Set arguments & environment variables
ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV
ARG PORT=80
ENV PORT $PORT

# Expose port
EXPOSE $PORT

# Install latest npm version
RUN npm i --global --silent npm@latest

# Install dependencies
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-optional --silent && npm cache clean --force
ENV PATH /app/node_modules/.bin:$PATH

# Healthcheck
HEALTHCHECK --interval=30s --start-period=30s --timeout=2s --retries=5 CMD node dist/src/healthcheck.js
RUN if [ "$NODE_ENV" != "local" ] ; then npm run build; else echo No build required.; fi

# Copy source code
WORKDIR /app/server
COPY ./ ./

RUN npm build

# Start application
CMD node dist/src/index.js