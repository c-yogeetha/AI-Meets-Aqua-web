#!/usr/bin/env python3
"""Validate featured snapshots and stage self-contained showcase data/assets."""
from __future__ import annotations
import json, re, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEATURED = ROOT / "backend/featured"
PUBLIC = ROOT / "frontend/public/showcase"
INDEX = ROOT / "frontend/src/data/showcase-index.json"
RESOURCES = ROOT / "frontend/src/data/showcase-resources.json"
CATALOG = ROOT / "backend/resources_public/catalog.json"


def safe_id(value: str) -> bool:
    return bool(re.fullmatch(r"[a-z0-9][a-z0-9-]{0,62}", value))


def build_featured() -> list[dict]:
    entries: list[dict] = []
    if not FEATURED.exists():
        FEATURED.mkdir(parents=True)
    for folder in sorted(p for p in FEATURED.iterdir() if p.is_dir() and not p.name.startswith(".")):
        snap_path = folder / "snapshot.json"
        if not snap_path.is_file():
            raise SystemExit(f"Featured folder is missing snapshot.json: {folder}")
        snap = json.loads(snap_path.read_text(encoding="utf-8"))
        item_id = str(snap.get("id", folder.name))
        if not safe_id(item_id) or item_id != folder.name:
            raise SystemExit(f"Featured id must be a safe slug matching its folder: {folder}")
        title = str(snap.get("title", "")).strip()
        description = str(snap.get("description", "")).strip()
        kind = snap.get("provenance")
        if not title or not description or kind not in {"synthetic", "open_licence"}:
            raise SystemExit(f"Invalid title/description/provenance in {snap_path}")
        result = snap.get("result")
        if not isinstance(result, dict) or not isinstance(result.get("fish", []), list):
            raise SystemExit(f"snapshot.json needs a result object with a fish array: {snap_path}")
        video = folder / "annotated.mp4"
        pdf = folder / "report.pdf"
        if not video.is_file() or not pdf.is_file():
            raise SystemExit(f"Featured item requires annotated.mp4 and report.pdf: {folder}")
        poster = folder / "poster.jpg"
        creator = source_url = license_name = attribution = None
        if kind == "open_licence":
            creator = str(snap.get("creator", "")).strip()
            source_url = str(snap.get("source_url", "")).strip()
            license_name = str(snap.get("license", "")).strip()
            attribution = str(snap.get("attribution", "")).strip()
            if not creator or not source_url.startswith("https://") or not license_name or not attribution:
                raise SystemExit(f"Open-licence entry requires creator, https source_url, license and attribution: {snap_path}")
            if "BY-SA" in license_name.upper() and "share" not in attribution.lower():
                raise SystemExit(f"CC BY-SA attribution must explicitly preserve share-alike: {snap_path}")
        target = PUBLIC / item_id
        target.mkdir(parents=True, exist_ok=True)
        shutil.copy2(snap_path, target / "snapshot.json")
        shutil.copy2(video, target / "annotated.mp4")
        shutil.copy2(pdf, target / "report.pdf")
        if poster.is_file():
            shutil.copy2(poster, target / "poster.jpg")
        tank = result.get("tank") or {}
        entries.append({
            "id": item_id, "title": title,
            "kind": kind,
            "badge": "Synthetic demonstration" if kind == "synthetic" else "Open-licence clip, analysed by Matsya",
            "description": description,
            "tankName": tank.get("name"),
            "createdAt": result.get("created_at"),
            "score": result.get("tank_score"),
            "level": result.get("level"),
            "fishCount": len(result.get("fish") or []),
            "analysisTimeSeconds": result.get("analysis_time_s"),
            "videoUrl": f"/showcase/{item_id}/annotated.mp4",
            "pdfUrl": f"/showcase/{item_id}/report.pdf",
            "posterUrl": f"/showcase/{item_id}/poster.jpg" if poster.is_file() else None,
            "creator": creator,
            "sourceUrl": source_url,
            "license": license_name,
            "attribution": attribution,
        })
    INDEX.write_text(json.dumps(entries, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (PUBLIC / "index.json").write_text(json.dumps(entries, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return entries


def build_resources() -> list[dict]:
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    res_target = PUBLIC / "resources"
    res_target.mkdir(parents=True, exist_ok=True)
    rows = []
    for item in catalog:
        rid = str(item["id"])
        if not safe_id(rid):
            raise SystemExit(f"Unsafe resource id: {rid}")
        file_url = thumb_url = preview_url = None
        if item.get("has_file"):
            files = list((ROOT / "backend/resources_public/files").glob(rid + ".*"))
            if len(files) != 1:
                raise SystemExit(f"Expected one bundled resource file for {rid}, found {len(files)}")
            dest = res_target / f"{rid}{files[0].suffix}"
            shutil.copy2(files[0], dest)
            file_url = f"/showcase/resources/{dest.name}"
        thumb = ROOT / "backend/resources_public/thumbs" / f"{rid}.png"
        if thumb.is_file():
            dest = res_target / thumb.name
            shutil.copy2(thumb, dest)
            thumb_url = f"/showcase/resources/{dest.name}"
        preview = ROOT / "backend/resources_public/previews" / f"{rid}.mp4"
        if preview.is_file():
            dest = res_target / f"preview-{rid}.mp4"
            shutil.copy2(preview, dest)
            preview_url = f"/showcase/resources/{dest.name}"
        rows.append({
            "id": rid, "title": item["title"], "description": item["description"],
            "category": item["category"], "type": item["type"],
            "year": item.get("year"), "sizeBytes": item.get("size_bytes", 0),
            "fileUrl": file_url, "thumbUrl": thumb_url, "previewUrl": preview_url,
            "synthetic": "synthetic" in (item.get("tags") or []),
        })
    RESOURCES.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (PUBLIC / "resources.json").write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return rows


def main() -> None:
    if PUBLIC.exists():
        shutil.rmtree(PUBLIC)
    PUBLIC.mkdir(parents=True)
    entries = build_featured()
    resources = build_resources()
    print(json.dumps({"featured_entries": len(entries), "resource_entries": len(resources), "static_api_dependencies": 0}, indent=2))

if __name__ == "__main__":
    main()
