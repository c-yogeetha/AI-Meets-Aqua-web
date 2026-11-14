#!/usr/bin/env python3
"""Production-like API smoke test: upload, analyse, report, media and persistence."""
from __future__ import annotations

import argparse
import http.cookiejar
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent


class Client:
    def __init__(self, base_url: str):
        self.base = base_url.rstrip("/")
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))

    def request(self, path: str, method: str = "GET", body: bytes | None = None, headers: dict[str, str] | None = None):
        req = urllib.request.Request(self.base + path, data=body, headers=headers or {}, method=method)
        try:
            with self.opener.open(req, timeout=30) as response:
                return response.status, {key.lower(): value for key, value in response.headers.items()}, response.read()
        except urllib.error.HTTPError as error:
            return error.code, {key.lower(): value for key, value in error.headers.items()}, error.read()


def multipart(fields: dict[str, str], file_path: Path) -> tuple[bytes, str]:
    boundary = "----MatsyaSmoke" + uuid.uuid4().hex
    chunks: list[bytes] = []
    for key, value in fields.items():
        chunks.extend([
            f"--{boundary}\r\n".encode(),
            f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode(),
            value.encode(),
            b"\r\n",
        ])
    data = file_path.read_bytes()
    chunks.extend([
        f"--{boundary}\r\n".encode(),
        f'Content-Disposition: form-data; name="file"; filename="{file_path.name}"\r\n'.encode(),
        b"Content-Type: video/mp4\r\n\r\n",
        data,
        b"\r\n",
        f"--{boundary}--\r\n".encode(),
    ])
    return b"".join(chunks), boundary


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("base_url")
    parser.add_argument("--restart-backend", action="store_true")
    parser.add_argument("--timeout", type=int, default=240)
    parser.add_argument("--repeat", type=int, default=int(os.environ.get("MATSYA_SMOKE_REPEAT", "1")))
    args = parser.parse_args()
    if args.repeat < 1 or args.repeat > 20:
        parser.error("--repeat must be between 1 and 20")

    client = Client(args.base_url)
    checks: list[dict[str, Any]] = []

    status, _, body = client.request("/health")
    assert status == 200 and b'"status":"ok"' in body.replace(b" ", b""), (status, body[:200])
    checks.append({"path": "/health", "status": status})

    status, _, _ = client.request("/api/docs")
    assert status == 200, status
    checks.append({"path": "/api/docs", "status": status})

    status, headers, body = client.request("/api/v1/system/status")
    assert status == 200, (status, body[:300])
    system = json.loads(body)
    assert system.get("mode") == "baseline", system.get("mode")
    assert system.get("onnx_eligible") is False, system.get("onnx_eligible")
    checks.append({
        "path": "/api/v1/system/status",
        "status": status,
        "mode": system.get("mode"),
        "onnx_eligible": system.get("onnx_eligible"),
        "onnx_reason": system.get("onnx_reason"),
    })

    tank_name = "Matsya Smoke " + time.strftime("%Y%m%d-%H%M%S")
    tank_payload = json.dumps({"name": tank_name, "volume_l": 60.0, "goldfish_count": 3}).encode()
    status, _, body = client.request(
        "/api/v1/tanks",
        method="POST",
        body=tank_payload,
        headers={"Content-Type": "application/json"},
    )
    assert status == 201, (status, body[:400])
    tank_id = json.loads(body)["id"]
    checks.append({"operation": "create_tank", "status": status, "tank_id": tank_id})

    video_path = ROOT / "samples" / "calm.mp4"
    if not video_path.exists():
        raise FileNotFoundError(video_path)
    job_ids: list[str] = []
    for sequence in range(args.repeat):
        form, boundary = multipart({"tank_id": tank_id, "view": "side"}, video_path)
        status, _, body = client.request(
            "/api/v1/videos",
            method="POST",
            body=form,
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        )
        assert status == 202, (status, body[:400])
        job_id = json.loads(body)["job_id"]
        checks.append({"operation": "upload_clip", "sequence": sequence + 1, "status": status, "job_id": job_id, "bytes": video_path.stat().st_size})

        deadline = time.monotonic() + args.timeout
        job: dict[str, Any] = {}
        while time.monotonic() < deadline:
            status, _, body = client.request(f"/api/v1/jobs/{job_id}")
            assert status == 200, (status, body[:400])
            job = json.loads(body)
            if job.get("status") in {"done", "failed", "cancelled"}:
                break
            time.sleep(2)
        assert job.get("status") == "done", {"job": job, "timeout": args.timeout}
        job_ids.append(job_id)
        checks.append({"operation": "analysis_job", "sequence": sequence + 1, "status": job.get("status"), "progress": job.get("progress")})
    checks.append({"operation": "sequential_analysis_soak", "completed": len(job_ids)})

    status, _, body = client.request(f"/api/v1/results/{job_id}")
    assert status == 200, (status, body[:500])
    result = json.loads(body)
    assert result.get("tank", {}).get("name") == tank_name
    assert result.get("mode") == "baseline"
    checks.append({
        "operation": "result",
        "status": status,
        "tank_name": result.get("tank", {}).get("name"),
        "fish_count": result.get("fish_count"),
        "mode": result.get("mode"),
        "preprocess": result.get("detection", {}).get("preprocess"),
    })

    status, pdf_headers, pdf_bytes = client.request(f"/api/v1/results/{job_id}/report.pdf")
    assert status == 200, (status, pdf_bytes[:300])
    assert pdf_headers.get("content-type", "").startswith("application/pdf")
    assert "no-store" in pdf_headers.get("cache-control", "").lower()
    assert "filename=" in pdf_headers.get("content-disposition", "")
    assert len(pdf_bytes) > 20 * 1024, len(pdf_bytes)
    assert pdf_bytes[:5] == b"%PDF-", pdf_bytes[:10]
    try:
        from pypdf import PdfReader
        from io import BytesIO
        pdf = PdfReader(BytesIO(pdf_bytes))
        assert len(pdf.pages) >= 1
        pdf_text = "\n".join(page.extract_text() or "" for page in pdf.pages)
        assert "Matsya" in pdf_text
        assert tank_name in pdf_text
        page_count = len(pdf.pages)
    except ImportError as exc:
        raise RuntimeError("pypdf is required for the PDF smoke test") from exc
    checks.append({"operation": "pdf", "status": status, "bytes": len(pdf_bytes), "pages": page_count})

    status, video_headers, video_bytes = client.request(
        f"/api/v1/results/{job_id}/video",
        headers={"Range": "bytes=0-1023"},
    )
    assert status == 206, (status, video_headers)
    assert len(video_bytes) > 0
    assert video_headers.get("content-range", "").startswith("bytes 0-")
    checks.append({"operation": "annotated_video_range", "status": status, "bytes": len(video_bytes), "content_range": video_headers.get("content-range")})

    key_moments = result.get("key_moments", [])
    if key_moments:
        frame_url = key_moments[0].get("frame_url")
        if frame_url:
            status, frame_headers, frame_bytes = client.request(frame_url)
            assert status == 200 and len(frame_bytes) > 100
            checks.append({"operation": "key_frame", "status": status, "bytes": len(frame_bytes), "content_type": frame_headers.get("content-type")})
    else:
        checks.append({"operation": "key_frame", "status": "NO_KEY_MOMENT", "note": "No key moment generated for this clip"})

    if args.restart_backend:
        compose_file = Path(os.environ.get("MATSYA_COMPOSE_FILE", str(ROOT / "deploy" / "docker-compose.prod.yml")))
        compose = ["sudo", "-n", "docker", "compose", "-f", str(compose_file), "--env-file", str(ROOT / "deploy" / ".env")]
        restart = subprocess.run(compose + ["restart", "backend"], cwd=ROOT, capture_output=True, text=True)
        assert restart.returncode == 0, restart.stderr[-1000:]
        restarted = False
        for _ in range(60):
            try:
                status, _, _ = client.request("/health")
                if status == 200:
                    restarted = True
                    break
            except Exception:
                pass
            time.sleep(2)
        assert restarted, "Backend did not become healthy after restart"
        status, _, after_restart = client.request(f"/api/v1/results/{job_id}")
        assert status == 200 and json.loads(after_restart).get("job_id") == job_id
        checks.append({"operation": "backend_restart_persistence", "status": status})

    print(json.dumps({"passed": True, "base_url": args.base_url, "tank_id": tank_id, "job_id": job_id, "jobs_completed": len(job_ids), "checks": checks}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
