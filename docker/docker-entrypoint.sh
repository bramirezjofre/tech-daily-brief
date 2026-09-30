#!/bin/sh
# docker-entrypoint.sh
# -----------------------------------------------------------------------------
# Substitutes environment variables in the Nginx template and starts Nginx in
# the foreground. Defaults match the values in the Dockerfile.
# -----------------------------------------------------------------------------
set -eu

NGINX_PORT="${NGINX_PORT:-8080}"
NGINX_HOST="${NGINX_HOST:-_}"
NGINX_WORKERS="${NGINX_WORKERS:-auto}"

# envsubst ships with nginx:alpine and only substitutes the listed vars,
# which avoids clobbering anything else.
export NGINX_PORT NGINX_HOST NGINX_WORKERS

envsubst '${NGINX_PORT} ${NGINX_HOST} ${NGINX_WORKERS}' \
    < /etc/nginx/templates/default.conf.template \
    > /etc/nginx/conf.d/default.conf

# Drop privileges (already running as the `nginx` user via USER directive,
# but keep this in case the image is invoked with `--user 0:0`).
if [ "$(id -u)" = "0" ]; then
    exec su-exec nginx "$@"
fi

exec "$@"
