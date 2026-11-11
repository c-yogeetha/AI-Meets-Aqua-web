# AI Meets Aqua - Deployment Guide

This document describes how to deploy **AI Meets Aqua** in various environments, from local execution on Linux (Fedora/Ubuntu) to containerized deployment with Docker/Podman, and cloud hosting with Cloudflare tunnels.

---

## 1. Local Native Deployment (Recommended for Demos)

Running natively on the host machine provides the lowest latency, zero network dependency, and direct access to CPU/GPU acceleration for computer vision algorithms.

### System Requirements
- **OS**: Fedora 39/40, Ubuntu 22.04/24.04, or any modern Linux distribution.
- **Python**: 3.12+
- **Node.js**: 20.x+
- **Hardware**: 4+ CPU cores, 8 GB+ RAM.

### Quick Start
```bash
# 1. Clone repository
git clone https://github.com/atria-cse/AI-Meets-Aqua.git
cd AI-Meets-Aqua

# 2. Setup dependencies
make setup

# 3. Launch both backend & frontend
./scripts/dev.sh
```

The application will be live at:
- **Frontend Web UI**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **Interactive OpenAPI Documentation**: `http://localhost:8000/docs`

---

## 2. Containerized Deployment (Docker / Podman)

Both the backend and frontend are containerized with multi-stage, secure container images.

### Running with Docker Compose
```bash
docker compose up --build -d
```

### Running with Podman on Fedora
Fedora provides native rootless Podman:
```bash
# Ensure podman-compose is installed
sudo dnf install -y podman podman-compose

# Build and start services
podman-compose up --build -d
```

To view logs:
```bash
podman-compose logs -f
```

To stop containers:
```bash
podman-compose down
```

---

## 3. Remote Cloud Hosting & Cloudflare Tunnels (Zero-Cost Public Demo)

If evaluators require a public URL without paying for cloud GPU or hosting instances, you can host the application on your local machine and expose it via Cloudflare Quick Tunnels:

### Step 1: Install Cloudflare Tunnel Client
```bash
# Fedora
sudo dnf install -y https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-x86_64.rpm

# Ubuntu / Debian
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

### Step 2: Expose the Backend
```bash
cloudflared tunnel --url http://localhost:8000
```
This command outputs an ephemeral URL such as `https://<random-subdomain>.trycloudflare.com`.

### Step 3: Configure Frontend & CORS
Set the backend URL for the frontend:
```bash
export NEXT_PUBLIC_API_URL=https://<random-subdomain>.trycloudflare.com
```
In `backend/.env` or when launching backend:
```bash
CORS_ORIGIN_REGEX='https://.*\.(vercel\.app|trycloudflare\.com)'
```

You can deploy the frontend to Vercel for free, or tunnel port 3000 as well:
```bash
cloudflared tunnel --url http://localhost:3000
```

---

## 4. Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Type | Default | Description |
|---|---|---|---|
| `ANALYZER` | String | `baseline` | Computer vision engine mode: `baseline`, `mock`, or `external`. |
| `STAGE_DELAY_S` | Float | `0.0` | Simulated stage delay in seconds (useful for demo animations). |
| `DATA_DIR` | String | `./data` | File storage path for uploads, rendered clips, and thumbnails. |
| `DATABASE_URL` | String | `sqlite:///data/aqua.db` | SQLAlchemy database connection string. |
| `CORS_ORIGINS` | List | `http://localhost:3000,...` | Allowed CORS origins for browser fetch calls. |
| `ENABLE_TEST_HOOKS` | Boolean | `0` | Enables simulated pipeline failures via `__fail__` token. |
| `AI_MODULE` | String | `ai.pipeline` | Python module path when `ANALYZER=external`. |

### Frontend (`frontend/.env.local`)

| Variable | Type | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | String | `http://localhost:8000` | Base URL of the FastAPI backend. |
