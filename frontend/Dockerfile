FROM node:21.6.1 AS build

WORKDIR /usr/src/app
COPY package*.json ./
# Retry slow registry requests, but fail in about a minute rather than sitting silent for the
# 16 minutes the previous mintimeout imposed before it even retried once.
RUN npm config set fetch-retry-maxtimeout 60000
RUN npm config set fetch-retry-mintimeout 10000
# npm ci installs straight from package-lock.json: deterministic, and it skips the peer dependency
# resolution pass that made install slow here.
RUN NODE_OPTIONS="--max_old_space_size=4096" npm ci
COPY . .
RUN npm run build

FROM nginx:1.27.0-alpine
COPY --from=build /usr/src/app/build /usr/share/nginx/html
COPY --from=build /usr/src/app/.env.example /usr/share/nginx/html/.env
COPY --from=build /usr/src/app/nginx-custom.conf /etc/nginx/conf.d/default.conf

RUN apk add --update nodejs
RUN apk add --update npm

RUN npm i -g runtime-env-cra

WORKDIR /usr/share/nginx/html
EXPOSE 3000

CMD ["/bin/sh", "-c", "runtime-env-cra && nginx -g \"daemon off;\""]

