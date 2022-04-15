FROM nginx:mainline-alpine

RUN apk add --no-cache jq

COPY nginx.sh /

ENTRYPOINT ["/nginx.sh"]

CMD ["nginx", "-g", "daemon off;"]