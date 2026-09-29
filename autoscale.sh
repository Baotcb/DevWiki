#!/bin/sh

set -u


MIN_REPLICAS="${MIN_REPLICAS:-1}"
MAX_REPLICAS="${MAX_REPLICAS:-4}"
SCALE_UP_CPU="${SCALE_UP_CPU:-75}"
SCALE_DOWN_CPU="${SCALE_DOWN_CPU:-30}"
COOLDOWN="${COOLDOWN:-60}"
CHECK_INTERVAL="${CHECK_INTERVAL:-30}"

COMPOSE_FILE="/project/docker-compose.yml"
SERVICE="devwiki-api"
NGINX_CONTAINER="devwiki-nginx"
LOG_DIR="/var/log/autoscale"
LOG_FILE="$LOG_DIR/autoscale.log"

mkdir -p "$LOG_DIR"


last_scale_time=0

log() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "$msg" >> "$LOG_FILE"
    echo "$msg"
}

get_replicas() {

    docker compose -f "$COMPOSE_FILE" ps -q --status running "$SERVICE" 2>/dev/null \
        | wc -l \
        | tr -d ' '
}

get_avg_cpu() {
    local ids
    ids=$(docker compose -f "$COMPOSE_FILE" ps -q "$SERVICE" 2>/dev/null | tr '\n' ' ')

    if [ -z "$ids" ]; then
        echo "0"
        return
    fi


    docker stats --no-stream --format "{{.CPUPerc}}" $ids 2>/dev/null \
        | tr -d '%' \
        | awk '{sum += $1; n++} END {if (n > 0) printf "%.1f", sum / n; else print "0"}'
}

do_scale() {
    local target="$1"
    local current="$2"
    local direction="$3"

    log "──────────────────────────────────────"
    log "SCALE $direction: $current → $target replicas"

    if ! docker compose -f "$COMPOSE_FILE" up -d \
            --scale "$SERVICE=$target" \
            --no-deps --no-recreate 2>&1 \
        | while IFS= read -r line; do log "  compose: $line"; done
    then
        log "ERROR: docker compose scale failed"
        return 1
    fi


    log "Waiting 15s for containers to become healthy..."
    sleep 15


    if docker exec "$NGINX_CONTAINER" nginx -s reload 2>/dev/null; then
        log "Nginx reloaded — upstream refreshed"
    else
        log "WARNING: Nginx reload failed (container may not be running)"
    fi

    last_scale_time=$(date +%s)
    log "Scale complete. Cooldown ${COOLDOWN}s starts now."
    log "──────────────────────────────────────"
}

log "============================================"
log "DevWiki API Auto-Scaler started"
log "  Replicas : min=$MIN_REPLICAS  max=$MAX_REPLICAS"
log "  Scale UP : avg CPU > ${SCALE_UP_CPU}%"
log "  Scale DOWN: avg CPU < ${SCALE_DOWN_CPU}%"
log "  Cooldown : ${COOLDOWN}s"
log "  Interval : ${CHECK_INTERVAL}s"
log "============================================"

while true; do
    replicas=$(get_replicas)
    avg_cpu=$(get_avg_cpu)
    now=$(date +%s)
    since=$((now - last_scale_time))

    if [ "$since" -lt "$COOLDOWN" ]; then
        remaining=$((COOLDOWN - since))
        log "CHECK: replicas=$replicas  avg_cpu=${avg_cpu}%  cooldown=${remaining}s"
        sleep "$CHECK_INTERVAL"
        continue
    fi

    log "CHECK: replicas=$replicas  avg_cpu=${avg_cpu}%  cooldown=ready"

    need_up=$(echo "$avg_cpu $SCALE_UP_CPU" | awk '{print ($1 > $2)}')
    if [ "$need_up" = "1" ] && [ "$replicas" -lt "$MAX_REPLICAS" ]; then
        do_scale $((replicas + 1)) "$replicas" "UP"
        sleep "$CHECK_INTERVAL"
        continue
    fi

    
    need_down=$(echo "$avg_cpu $SCALE_DOWN_CPU" | awk '{print ($1 < $2)}')
    if [ "$need_down" = "1" ] && [ "$replicas" -gt "$MIN_REPLICAS" ]; then
        do_scale $((replicas - 1)) "$replicas" "DOWN"
        sleep "$CHECK_INTERVAL"
        continue
    fi

    sleep "$CHECK_INTERVAL"
done
