#!/bin/sh

PROXY_SKIP_VERIFY="${PROXY_SKIP_VERIFY:-false}"
MAX_BYTES="${MAX_BYTES:-50000}"
RECORD_POLL_TIMEOUT="${RECORD_POLL_TIMEOUT:-2000}"
DEBUG_LOGS_ENABLED="${DEBUG_LOGS_ENABLED:-true}"
INSECURE_PROXY=""
EXPERIMENTAL_PROXY_URL="${EXPERIMENTAL_PROXY_URL:-false}"

cat /caddy/Caddyfile.template > /caddy/Caddyfile

{
    if echo "$PROXY_SKIP_VERIFY" | egrep -sq "true|TRUE|y|Y|yes|YES|1"; then
        INSECURE_PROXY=insecure_skip_verify
    fi

    if echo $PROXY | egrep -sq "true|TRUE|y|Y|yes|YES|1" \
            && [[ ! -z "$KAFKA_REST_PROXY_URL" ]]; then
        echo "Enabling proxy."
        cat <<EOF >>/caddy/Caddyfile
proxy /api/kafka-rest-proxy $KAFKA_REST_PROXY_URL {
    without /api/kafka-rest-proxy
    $INSECURE_PROXY
}
EOF
        if echo "$EXPERIMENTAL_PROXY_URL" | egrep -sq "true|TRUE|y|Y|yes|YES|1"; then
            KAFKA_REST_PROXY_URL=api/kafka-rest-proxy
        else
            KAFKA_REST_PROXY_URL=/api/kafka-rest-proxy
        fi
    fi

    if [[ -z "$KAFKA_REST_PROXY_URL" ]]; then
        echo "Kafka REST Proxy URL was not set via KAFKA_REST_PROXY_URL environment variable."
    else
        echo "Kafka REST Proxy URL to $KAFKA_REST_PROXY_URL."
        cat <<EOF >kafka-topics-ui/env.js
var clusters = [
   {
     NAME:"default",
     KAFKA_REST: "$KAFKA_REST_PROXY_URL",
     MAX_BYTES: "$MAX_BYTES",
     RECORD_POLL_TIMEOUT: "$RECORD_POLL_TIMEOUT",
     DEBUG_LOGS_ENABLED: $DEBUG_LOGS_ENABLED
   }
]
EOF
    fi

    # Here we emulate the output by Caddy. Why? Because we can't
    # redirect caddy to stderr as the logging would also get redirected.
    echo
    echo "Activating privacy features... done."
    echo "http://0.0.0.0:8000"
} 1>&2

exec /caddy/caddy -conf /caddy/Caddyfile -quiet
