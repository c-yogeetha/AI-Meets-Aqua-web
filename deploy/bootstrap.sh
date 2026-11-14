#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
SUDO=()
if [ "$(id -u)" -ne 0 ]; then SUDO=(sudo); fi
if ! command -v docker >/dev/null 2>&1; then
  "${SUDO[@]}" apt-get update
  "${SUDO[@]}" apt-get install -y docker.io docker-compose-v2
fi
"${SUDO[@]}" systemctl enable --now containerd docker
if ! docker info >/dev/null 2>&1; then
  if sudo -n docker info >/dev/null 2>&1; then DOCKER=(sudo -n docker); else echo 'Docker daemon cannot be accessed.' >&2; exit 1; fi
else
  DOCKER=(docker)
fi
# Permit public web ingress; also configure the provider's network security list.
if command -v ufw >/dev/null 2>&1; then
  "${SUDO[@]}" ufw allow 80/tcp
  "${SUDO[@]}" ufw allow 443/tcp
else
  "${SUDO[@]}" iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || "${SUDO[@]}" iptables -I INPUT -p tcp --dport 80 -j ACCEPT
  "${SUDO[@]}" iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || "${SUDO[@]}" iptables -I INPUT -p tcp --dport 443 -j ACCEPT
fi
# Create a 2 GB swap file when the VM has none.
if ! swapon --show --noheadings | grep -q . && [ ! -e /swapfile ]; then
  "${SUDO[@]}" fallocate -l 2G /swapfile
  "${SUDO[@]}" chmod 600 /swapfile
  "${SUDO[@]}" mkswap /swapfile
  "${SUDO[@]}" swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' | "${SUDO[@]}" tee -a /etc/fstab >/dev/null
fi
if [ ! -f deploy/.env ]; then cp deploy/.env.example deploy/.env; fi
SITE_ADDRESS="$(grep -E '^SITE_ADDRESS=' deploy/.env | tail -1 | cut -d= -f2- || true)"
if [ -z "$SITE_ADDRESS" ] || [ "$SITE_ADDRESS" = ':80' ]; then
  echo 'Set SITE_ADDRESS in deploy/.env to the DNS hostname before running bootstrap again.' >&2
  exit 2
fi
"${DOCKER[@]}" compose --env-file deploy/.env -f deploy/docker-compose.prod.yml up -d --build
for i in $(seq 1 90); do
  if curl -fsS --resolve "$SITE_ADDRESS:80:127.0.0.1" "http://$SITE_ADDRESS/health" >/dev/null 2>&1; then
    echo "Matsya is running. Public address: https://$SITE_ADDRESS"
    exit 0
  fi
  sleep 2
done
echo 'Matsya did not become healthy in the allotted startup window.' >&2
"${DOCKER[@]}" compose --env-file deploy/.env -f deploy/docker-compose.prod.yml logs --tail=120
exit 1
