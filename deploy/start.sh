#!/bin/sh
set -eu

: "${PORT:=10000}"

envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

exec supervisord -c /etc/supervisor/conf.d/supervisord.conf
