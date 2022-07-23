#!/bin/sh

CONF_FILE=/etc/nginx/conf.d/default.conf
OPTIONS_FILE=$DATA_DIR/options.json

# Get values from options.json
if [ -f "$OPTIONS_FILE" ]; then
    DOMAIN=$(jq -r '.domain? // ""' $OPTIONS_FILE)
    CDNDOMAIN=$(jq -r '.cdn_domain? // "cdn.iplayif.com"' $OPTIONS_FILE)
    HTTPS=$(jq -r '.https? // false' $OPTIONS_FILE)
    RELOAD_TIME=$(jq -r '.nginx?.reload_time? // 360' $OPTIONS_FILE)
    SECONDARY_DOMAIN=$(jq -r '.secondary_domain? // ""' $OPTIONS_FILE)
    WWW=$(jq -r '.www? // false' $OPTIONS_FILE)
fi

if [ "$WWW" = "true" ]; then
    WWW_DOMAIN="www.$DOMAIN"
fi

# Common gzip settings
GZIP="gzip on;
    gzip_proxied any;
    gzip_types *;"

# Default listen settings
LISTEN="listen 80;
    listen [::]:80;"

# Erase the conf file
> $CONF_FILE

# Handle HTTPS
if [ -n "$DOMAIN" ]; then
    DOMAIN_SERVERS="server_name ${DOMAIN} ${SECONDARY_DOMAIN};"

    # See if we're ready for HTTPS
    CERTNAME="${DOMAIN}${WWW_DOMAIN}${SECONDARY_DOMAIN}"
    CERT_DIR=$DATA_DIR/certbot/live/$CERTNAME
    if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
        HTTPS="false"
    fi
    if [ "$HTTPS" = "true" ]; then
        LISTEN="listen 443 ssl;
    listen [::]:443 ssl;"

        SSL="ssl_certificate $CERT_DIR/fullchain.pem;
    ssl_certificate_key $CERT_DIR/privkey.pem;"

        cat >> $CONF_FILE <<EOF
server {
    listen 80;
    listen [::]:80;
    return 301 https://\$host\$request_uri;
}
EOF
    fi
fi

# Handle www.
if [ "$WWW" = "true" ]; then
    cat >> $CONF_FILE <<EOF
server {
    $LISTEN
    server_name ${WWW_DOMAIN};
    $SSL
    return 301 https://${DOMAIN}\$request_uri;
}
EOF
fi

# Main domain
cat >> $CONF_FILE <<EOF
server {
    $LISTEN
    $DOMAIN_SERVERS
    $SSL
    $GZIP

    location = / {
        proxy_pass http://app:8080;
    }

    location /proxy {
        proxy_pass http://app:8080;
    }

    location / {
        proxy_pass https://$CDNDOMAIN;
    }
}
EOF

# Log the contructed config file
echo Constructed $CONF_FILE
cat $CONF_FILE

# Periodically restart the server if in HTTPS mode
if [ "$HTTPS" = "true" ]; then
    trap exit TERM
    while :; do
        sleep ${RELOAD_TIME}m & wait ${!}
        echo Restarting Nginx
        nginx -s reload
    done &
fi

# Invoke the Nginx image's startup script
/docker-entrypoint.sh "$@"