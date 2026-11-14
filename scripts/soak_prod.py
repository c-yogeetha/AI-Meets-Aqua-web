#!/usr/bin/env python3
"""Exercise concurrent visitor upload and analysis workflows against a live stack."""
from __future__ import annotations

import argparse
import concurrent.futures
import json
import time
from pathlib import Path
from typing import Any

from smoke_prod import Client, multipart

ROOT = Path(__file__).resolve().parent.parent


def create_tank(client: Client, visitor: int) -> tuple[str, str]:
    name = f"Matsya Soak Visitor {visitor} {time.strftime('%Y%m%d-%H%M%S')}"
    payload = json.dumps({"name": name, "volume_l": 75.0, "goldfish_count": 3}).encode()
    status, _, body = client.request(
        "/api/v1/tanks",
        method="POST",
        body=payload,
        headers={"Content-Type": "application/json"},
    )
    assert status == 201, (status, body[:400])
    return json.loads(body)["id"], name


def run_visitor(base_url: str, visitor: int, uploads: int, timeout_s: int) -> list[dict[str, Any]]:
    client = Client(base_url)
    tank_id, tank_name = create_tank(client, visitor)
    records: list[dict[str, Any]] = []
    clips = [ROOT / "samples" / "calm.mp4", ROOT / "samples" / "stressed_one.mp4"]

    for sequence in range(uploads):
        clip = clips[(sequence + visitor - 1) % len(clips)]
        form, boundary = multipart({"tank_id": tank_id, "view": "side"}, clip)
        status, _, body = client.request(
            "/api/v1/videos",
            method="POST",
            body=form,
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        )
        assert status == 202, {"visitor": visitor, "sequence": sequence + 1, "status": status, "body": body[:300]}
        job_id = json.loads(body)["job_id"]
        deadline = time.monotonic() + timeout_s
        job: dict[str, Any] = {}
        while time.monotonic() < deadline:
            status, _, body = client.request(f"/api/v1/jobs/{job_id}")
            assert status == 200, (status, body[:300])
            job = json.loads(body)
            if job.get("status") in {"done", "failed", "cancelled"}:
                break
            time.sleep(1.5)
        assert job.get("status") == "done", {
            "visitor": visitor,
            "sequence": sequence + 1,
            "job_id": job_id,
            "job": job,
        }
        status, _, result_body = client.request(f"/api/v1/results/{job_id}")
        assert status == 200, (status, result_body[:300])
        result = json.loads(result_body)
        assert result.get("tank", {}).get("name") == tank_name
        assert result.get("mode") == "baseline"
        records.append({
            "visitor": visitor,
            "sequence": sequence + 1,
            "clip": clip.name,
            "job_id": job_id,
            "status": job.get("status"),
            "result_status": status,
            "tank_id": tank_id,
        })
    return records


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("base_url")
    parser.add_argument("--visitors", type=int, default=2)
    parser.add_argument("--uploads-per-visitor", type=int, default=10)
    parser.add_argument("--timeout", type=int, default=300)
    args = parser.parse_args()
    if args.visitors != 2:
        parser.error("The acceptance soak is specified for exactly two concurrent visitors")
    if not 1 <= args.uploads_per_visitor <= 20:
        parser.error("--uploads-per-visitor must be between 1 and 20")

    started = time.monotonic()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.visitors) as pool:
        futures = [
            pool.submit(run_visitor, args.base_url, visitor, args.uploads_per_visitor, args.timeout)
            for visitor in range(1, args.visitors + 1)
        ]
        records = [record for future in concurrent.futures.as_completed(futures) for record in future.result()]

    records.sort(key=lambda row: (row["visitor"], row["sequence"]))
    expected = args.visitors * args.uploads_per_visitor
    assert len(records) == expected
    report = {
        "passed": True,
        "visitors": args.visitors,
        "uploads_per_visitor": args.uploads_per_visitor,
        "uploads_completed": len(records),
        "failed_jobs": sum(row["status"] != "done" for row in records),
        "duration_seconds": round(time.monotonic() - started, 2),
        "records": records,
    }
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
