# Matsya Deployment Guide

This guide details how to build, configure, deploy, back up, and update the Matsya platform in a production Linux environment using Docker Compose and Caddy.

---

## 1. Prerequisites

- **OS**: Modern Linux distribution (Fedora, Ubuntu 22.04+, Debian 12+)
- **Container Runtime**: Docker Engine 24+ and Docker Compose v2+
- **Network**: Inbound ports 80 and 443 open for HTTP/HTTPS traffic
- **Storage**: Minimum 20 GB free disk space recommended for uploaded clips and cache

---

## 2. Directory Structure & Files

The production deployment package is located in `deploy/`:
- `deploy/backend.Dockerfile`: Hardened Python 3.12-slim backend container with Poppler and FFmpeg.
- `deploy/frontend.Dockerfile`: Multi-stage Node 20-alpine container with Next.js standalone server.
- `deploy/Caddyfile`: Reverse proxy configuration handling gzip/zstd compression, security headers, and static caching.
- `deploy/docker-compose.prod.yml`: Multi-container topology orchestrating Backend, Frontend, and Caddy.
- `deploy/.env.example`: Template for environment configuration.

---

## 3. Configuration & Environment Variables

Copy `deploy/.env.example` to `deploy/.env` and adjust the variables:

```bash
cp deploy/.env.example deploy/.env
```

### Key Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `SITE_ADDRESS` | `:80` | Public hostname or port (e.g. `matsya.example.com` or `:80`). Caddy will automatically provision TLS if a public domain is configured. |
| `DATA_DIR` | `/data` | Path to persistent volume holding uploads, SQLite database, and outputs. |
| `ANALYZER` | `auto` | Detection engine: `auto` selects ONNX if model exists, falling back to `baseline` classical detector. Options: `auto`, `baseline`, `onnx`, `mock`. |
| `MAX_UPLOAD_MB` | `120` | Maximum allowed video file upload size in megabytes. |
| `MAX_DURATION_S` | `90` | Maximum acceptable video clip length in seconds. |
| `RETENTION_DAYS` | `30` | Days to retain non-demo analysis outputs before automated purge. |
| `KEEP_UPLOADS` | `0` | If `0`, raw video uploads are deleted immediately after analysis completes. |
| `SINGLE_USER_MODE` | `0` | If `1`, disables multi-tenant cookie scoping so all clients share one view. |
| `NEXT_PUBLIC_DRIVE_URL` | `""` | Optional external Google Drive folder link for raw datasets. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | `""` | Contact email displayed in the footer. |
| `NEXT_PUBLIC_INDEXABLE` | `0` | Set to `1` to allow search engine indexing (`robots.txt`). |

---

## 4. Building and Starting Services

Navigate to the `deploy/` directory and start the stack:

```bash
cd deploy
docker compose -f docker-compose.prod.yml up -d --build
```

### Verifying Service Health

1. Check container health status:
```bash
docker compose -f docker-compose.prod.yml ps
```
The backend includes an internal health check that tests `GET http://127.0.0.1:8000/health`.

2. Inspect container logs:
```bash
docker compose -f docker-compose.prod.yml logs -f
```

3. Test public endpoint:
```bash
curl -i http://localhost/health
```

---

## 5. Backup and Restore Procedures

All application state, user accounts, uploaded videos, and analysis results reside in the `matsya-data` Docker volume (`/data`).

### Creating a Backup
```bash
docker run --rm \
  -v deploy_matsya-data:/data:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/matsya-backup-$(date +%Y%m%d_%H%M%S).tar.gz -C /data .
```

### Restoring from Backup
```bash
# 1. Stop application containers
docker compose -f deploy/docker-compose.prod.yml down

# 2. Extract backup tarball into volume
docker run --rm \
  -v deploy_matsya-data:/data \
  -v $(pwd)/backups:/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/<BACKUP_FILE>.tar.gz -C /data"

# 3. Restart application containers
docker compose -f deploy/docker-compose.prod.yml up -d
```

---

## 6. Upgrades and Updates

When deploying a new version of Matsya:

1. Pull or sync repository updates:
```bash
# Verify working tree is clean
```

2. Rebuild container images and perform zero-downtime container rolling restart:
```bash
cd deploy
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend
```

3. Check database schema integrity:
The backend automatically applies SQLite schema migrations upon container boot.
