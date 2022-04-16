#!/bin/sh

CREDENTIALS_FILE=$DATA_DIR/credentials.ini
OPTIONS_FILE=$DATA_DIR/options.json

# Check that credentials.ini and options.json both exist
if [ ! -f "$CREDENTIALS_FILE" ] || [ ! -f "$OPTIONS_FILE" ]; then
    echo HTTPS not enabled
    exit
fi

DOMAIN=$(jq -r '.domain? // ""' $OPTIONS_FILE)
EMAIL=$(jq -r '.certbot?.email? // ""' $OPTIONS_FILE)
HTTPS=$(jq -r '.https? // false' $OPTIONS_FILE)
RENEW_TIME=$(jq -r '.certbot?.renew_time? // 720' $OPTIONS_FILE)
SECONDARY_DOMAIN=$(jq -r '.secondary_domain? // ""' $OPTIONS_FILE)
TEST_MODE=$(jq -r '.certbot?.test? // false' $OPTIONS_FILE)
WWW=$(jq -r '.www? // false' $OPTIONS_FILE)

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ] || [ "$HTTPS" = "false" ]; then
    echo HTTPS not enabled
    exit
fi

if [ "$WWW" = "true" ]; then
    WWW_DOMAIN="www.$DOMAIN"
    WWW_DOMAIN_COMMAND="-d $WWW_DOMAIN"
fi

if [ -n "$SECONDARY_DOMAIN" ]; then
    SECONDARY_DOMAIN_COMMAND="-d $SECONDARY_DOMAIN"
fi

CERTNAME="${DOMAIN}${WWW_DOMAIN}${SECONDARY_DOMAIN}"

if [ "$TEST_MODE" = "true" ]; then
    TEST="--staging --test-cert"
fi

CMD="certbot \
    certonly \
    --cert-name $CERTNAME \
    --agree-tos \
    -d $DOMAIN \
    $WWW_DOMAIN_COMMAND \
    $SECONDARY_DOMAIN_COMMAND \
    --dns-cloudflare \
    --dns-cloudflare-credentials $CREDENTIALS_FILE \
    --keep \
    -m $EMAIL \
    --non-interactive \
    $TEST"

echo $CMD

trap exit TERM
while :; do
    $CMD
    sleep ${RENEW_TIME}m & wait ${!}
done