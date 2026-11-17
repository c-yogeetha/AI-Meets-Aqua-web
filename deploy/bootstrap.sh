#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then DRY_RUN=1; fi
SUDO=()
if [[ "$(id -u)" -ne 0 ]]; then SUDO=(sudo); fi

run_step() {
  local label="$1"; shift
  local log status
  printf '\n==> %s\n' "$label"
  printf '    command:'; printf ' %q' "$@"; printf '\n'
  if [[ "$DRY_RUN" -eq 1 ]]; then return 0; fi
  log="$(mktemp "${TMPDIR:-/tmp}/matsya-bootstrap.XXXXXX")"
  if "$@" >"$log" 2>&1; then
    [[ ! -s "$log" ]] || cat "$log"
    rm -f "$log"
  else
    status=$?
    echo "FAILED: $label (exit $status); last 30 lines:" >&2
    tail -n 30 "$log" >&2 || true
    rm -f "$log"
    return "$status"
  fi
}

ENV_FILE=deploy/.env
if [[ ! -f "$ENV_FILE" ]]; then
  if [[ "$DRY_RUN" -eq 1 ]]; then
    ENV_FILE=deploy/.env.example
  else
    run_step "Create deployment environment file" cp deploy/.env.example deploy/.env
  fi
fi
SITE_ADDRESS="${SITE_ADDRESS:-$(grep -E '^SITE_ADDRESS=' "$ENV_FILE" | tail -1 | cut -d= -f2- || true)}"
if [[ -z "$SITE_ADDRESS" || "$SITE_ADDRESS" == ":80" ]]; then
  echo 'Set SITE_ADDRESS in deploy/.env to the DNS hostname before bootstrap.' >&2
  exit 2
fi
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry run: SITE_ADDRESS=$SITE_ADDRESS"
  run_step "Install Docker if absent" "${SUDO[@]}" apt-get install -y docker.io docker-compose-v2
  run_step "Enable container services" "${SUDO[@]}" systemctl enable --now containerd docker
  run_step "Allow TCP ports 80 and 443" "${SUDO[@]}" iptables -I INPUT -p tcp -m multiport --dports 80,443 -j ACCEPT
  run_step "Create and enable 2 GB swap when none exists" "${SUDO[@]}" fallocate -l 2G /swapfile
  run_step "Build and start production services" docker compose --env-file deploy/.env -f deploy/docker-compose.prod.yml up -d --build
  run_step "Prune unused image build cache after successful health check" docker builder prune -af
  exit 0
fi

if ! command -v docker >/dev/null 2>&1; then
  run_step "Refresh package indexes" "${SUDO[@]}" apt-get update
  run_step "Install Docker and Compose plugin" "${SUDO[@]}" apt-get install -y docker.io docker-compose-v2
fi
run_step "Enable container services" "${SUDO[@]}" systemctl enable --now containerd docker
if docker info >/dev/null 2>&1; then
  DOCKER=(docker)
elif sudo -n docker info >/dev/null 2>&1; then
  DOCKER=(sudo -n docker)
else
  echo 'Docker daemon cannot be accessed.' >&2; exit 1
fi

if command -v ufw >/dev/null 2>&1; then
  if ! ufw status 2>/dev/null | grep -Eq '^80/tcp[[:space:]]+ALLOW'; then run_step "Allow HTTP ingress" "${SUDO[@]}" ufw allow 80/tcp; fi
  if ! ufw status 2>/dev/null | grep -Eq '^443/tcp[[:space:]]+ALLOW'; then run_step "Allow HTTPS ingress" "${SUDO[@]}" ufw allow 443/tcp; fi
else
  if ! "${SUDO[@]}" iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null; then run_step "Allow HTTP ingress" "${SUDO[@]}" iptables -I INPUT -p tcp --dport 80 -j ACCEPT; fi
  if ! "${SUDO[@]}" iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null; then run_step "Allow HTTPS ingress" "${SUDO[@]}" iptables -I INPUT -p tcp --dport 443 -j ACCEPT; fi
fi

if ! swapon --show --noheadings | grep -q . && [[ ! -e /swapfile ]]; then
  run_step "Allocate 2 GB swap file" "${SUDO[@]}" fallocate -l 2G /swapfile
  run_step "Set swap file permissions" "${SUDO[@]}" chmod 600 /swapfile
  run_step "Format and enable swap file" "${SUDO[@]}" mkswap /swapfile
  run_step "Activate swap file" "${SUDO[@]}" swapon /swapfile
  if ! grep -q '^/swapfile ' /etc/fstab; then
    run_step "Persist swap configuration" "${SUDO[@]}" bash -c "echo '/swapfile none swap sw 0 0' >> /etc/fstab"
  fi
fi

run_step "Build and start production services" "${DOCKER[@]}" compose --env-file deploy/.env -f deploy/docker-compose.prod.yml up -d --build
healthy=0
for _ in $(seq 1 90); do
  if curl -fsS --resolve "$SITE_ADDRESS:80:127.0.0.1" "http://$SITE_ADDRESS/health" >/dev/null 2>&1; then healthy=1; break; fi
  sleep 2
done
if [[ "$healthy" -ne 1 ]]; then
  echo 'Matsya did not become healthy in the startup window.' >&2
  "${DOCKER[@]}" compose --env-file deploy/.env -f deploy/docker-compose.prod.yml logs --tail=30 >&2 || true
  exit 1
fi
run_step "Prune unused build cache after successful startup" "${DOCKER[@]}" builder prune -af
echo "Matsya is running. Public address: https://$SITE_ADDRESS"
