# Matsya owner deployment guide

This guide prepares the owner-operated deployment. The owner creates and verifies the cloud account and server; no account, card, phone verification, or secret is handled by the project build process.

## 1. Hosting design

The recommended live app target is an Oracle Cloud Always Free Ampere A1 VM, sized conservatively for 2 OCPU and 12 GB RAM. Capacity and account eligibility vary by region and date; Always Free resources can be reclaimed under provider policy. The deployment is not considered permanent until the owner has created and tested the instance and confirmed the provider's current free-tier conditions.

The full app runs as a Docker Compose stack: Caddy, Next.js standalone, FastAPI, and persistent SQLite/media storage. Caddy provisions HTTPS when SITE_ADDRESS is a real hostname pointing to the VM. Do not use :80 for the public HTTPS deployment.

The permanent public layer is a static export. Build it with `./scripts/build_showcase.sh`; the self-contained output is `dist/showcase/`. Publish that directory to a static host. It contains public pages, the read-only analysis gallery, generated result snapshot pages, resource files, PDF reports and annotated videos from `backend/featured/`. It does not include the live API or any upload endpoint. Set `NEXT_PUBLIC_LIVE_APP_URL` to the owner-controlled HTTPS address when building so the showcase can link to the live layer. Keep `NEXT_PUBLIC_INDEXABLE=0` until the owner approves search indexing.

## 2. Owner prerequisites

- A Linux ARM64 VM with at least 2 cores, 12 GB RAM and 40 GB disk.
- Public ingress for TCP 80 and 443. Also allow them in the provider network security list and the VM firewall.
- Docker Engine and the Docker Compose plugin.
- A public DNS name pointing to the instance. A wildcard sslip.io hostname based on the VM's public IPv4 address can be used, or use a domain the owner controls.
- A secure SSH key retained outside this repository.

## 3. Prepare the release bundle

On the build machine, run:

    ./scripts/make_release.sh

Copy the generated dist/matsya-release-<date>.tar.gz to the server using the owner's own secure transfer method. Verify the archive listing does not contain .git, .work, samples_real, resources_inbox, node_modules, .venv, .env, or private keys.

On the server:

    mkdir -p ~/matsya
    tar -xzf matsya-release-*.tar.gz -C ~/matsya --strip-components=1
    cd ~/matsya

## 4. Configure and start the live app

Create deploy/.env from deploy/.env.example. Set SITE_ADDRESS to the DNS name that resolves to this VM. Keep NEXT_PUBLIC_INDEXABLE=0 until the owner explicitly approves indexing.

Set conservative operational parameters:

    ANALYZER=baseline
    MAX_UPLOAD_MB=120
    MAX_DURATION_S=90
    RETENTION_DAYS=30
    UPLOADS_PER_HOUR_PER_IP=20
    MAX_QUEUE=5
    SINGLE_USER_MODE=0
    KEEP_UPLOADS=0
    NEXT_PUBLIC_INDEXABLE=0

Do not place credentials or private keys in the repository. Then run:

    cd deploy
    docker compose -f docker-compose.prod.yml up -d --build
    docker compose -f docker-compose.prod.yml ps
    docker compose -f docker-compose.prod.yml logs --tail=100

Verify:

    curl -fsS https://$SITE_ADDRESS/health
    curl -fsSI https://$SITE_ADDRESS/
    curl -fsS https://$SITE_ADDRESS/api/v1/system/status

The first response should report status ok. The frontend must return HTTP 200, and the proxy should send the security headers documented in the QA checklist.

## 5. Backup, restore, update

Before every update:

    ./deploy/backup.sh

To update, unpack the new release over a separate working directory, review the changes, then use the manual update procedure in deploy/update.sh. Automatic image updaters are not enabled.

A backup is not proven until it has been restored into a scratch volume. Run the restore procedure on a non-production copy first and verify that a result, its PDF, and its annotated media open.

Keep at least seven dated backups. A server-level cron should call the backup script nightly and remove backups older than seven days. Confirm the cron log and restore a copy before depending on it.

## 6. Owner's first-run acceptance

- [ ] Public HTTPS certificate is valid.
- [ ] /health returns HTTP 200.
- [ ] Public home page and /validation load.
- [ ] Create an owner tank and upload a synthetic sample clip.
- [ ] The analysis completes and the result truthfully identifies the active classical detector.
- [ ] PDF downloads and opens as a PDF.
- [ ] Annotated video supports byte-range playback.
- [ ] Second browser profile cannot access the first profile's result.
- [ ] Security headers are present.
- [ ] Backup and restore test completed.
- [ ] Phone Safari / Android Chrome download checks completed.

## 7. Static showcase build and publication

From the repository root, add only cleared featured snapshots under `backend/featured/<slug>/` (see `backend/featured/README.md`), then run:

    NEXT_PUBLIC_INDEXABLE=0 NEXT_PUBLIC_LIVE_APP_URL=https://<owner-live-host> ./scripts/build_showcase.sh

The script validates attribution and required PDF/video assets, stages the resource library, builds a static export and checks that every featured media URL exists. Publish the contents of `dist/showcase/` as the static website root. The showcase is read-only; uploads and deletion remain in the live app. If there is no owner-controlled live HTTPS address yet, omit `NEXT_PUBLIC_LIVE_APP_URL`; the static page displays a clear unconfigured message rather than a false link.

## 7. Constraints and fallback

No cloud instance was created or deployed as part of this implementation. If the free VM cannot be provisioned in time, run the application on a borrowed or university-managed machine for the evaluation day only. A temporary tunnel is not a permanent deployment and must be labelled as such.
