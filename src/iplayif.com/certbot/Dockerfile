FROM certbot/dns-cloudflare:latest

RUN apk add --no-cache jq

COPY certbot.sh /

ENTRYPOINT ["/certbot.sh"]