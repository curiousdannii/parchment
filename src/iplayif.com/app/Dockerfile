# Stage 1: Build Babel

FROM alpine:latest as build-babel

WORKDIR /home

RUN apk add --no-cache build-base curl && \
    curl -L -s https://github.com/iftechfoundation/babel-tool/archive/refs/tags/v0.6.tar.gz | tar xz && \
    make -C babel-tool-0.6

# Stage 2: The app itself

FROM node:16-alpine

WORKDIR /home/app

COPY --from=build-babel /home/babel-tool-0.6/babel .

COPY package*.json ./

RUN npm ci --production

COPY . .

EXPOSE 8080

ENTRYPOINT ["node", "src/main.js"]