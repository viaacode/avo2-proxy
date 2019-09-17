FROM node:dubnium-alpine

# Set arguments & environment variables
ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV
ARG PORT=8000
ENV PORT $PORT

# Expose port
EXPOSE $PORT

# Install latest npm version
RUN npm i --global --silent npm@latest

# Install dependencies
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --production=false
# RUN  npm ci --no-optional  && npm cache clean --force
ENV PATH /app/node_modules/.bin:$PATH

# Healthcheck
#Disable for kubernetes https://github.com/kubernetes/kubernetes/pull/50796
#HEALTHCHECK --interval=30s --start-period=30s --timeout=2s --retries=5 CMD node dist/src/healthcheck.js
#RUN if [ "$NODE_ENV" != "local" ] ; then npm run build; else echo No build required.; fi

# Copy source code
COPY ./ ./
# set rights for openshift
RUN chgrp -R 0 /app/ && chmod -R g+rwX /app && chown node:node -R /app

# add user for openshift
USER node

RUN npm run build

# Start application
CMD node dist/src/app.js
