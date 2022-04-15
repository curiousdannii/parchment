#!/bin/sh

CONF_FILE=/etc/nginx/conf.d/default.conf
OPTIONS_FILE=$DATA_DIR/options.json

# Get values from options.json
if [ -f "$OPTIONS_FILE" ]; then
    CDNDOMAIN=$(jq -r '.cdn_domain? // "cdn.iplayif.com"' $OPTIONS_FILE)
    RELOAD_TIME=$(jq -r '.nginx?.reload_time? // 360' $OPTIONS_FILE)
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

# Main domain
cat >> $CONF_FILE <<EOF
server {
    $LISTEN
    $GZIP

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