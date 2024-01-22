# Stage 1: Build Babel

FROM alpine:latest as build-babel

WORKDIR /home

RUN apk add --no-cache build-base curl && \
    curl -L -s https://github.com/iftechfoundation/babel-tool/archive/8286dcfdb6bd21de59da0631894e784ac1331260.tar.gz | \
        tar xz --strip-components=1 && \
    make

# Stage 2: The app itself
# Note that the Docker context is the top level src/ folder

FROM node:20-alpine

EXPOSE 8080

WORKDIR /home/iplayif.com/app

COPY --from=build-babel /home/babel /usr/local/bin/

COPY iplayif.com/app/package*.json ./

RUN npm ci --production

COPY . ../../

RUN npm run build

ENTRYPOINT ["node", "build/main.js"]