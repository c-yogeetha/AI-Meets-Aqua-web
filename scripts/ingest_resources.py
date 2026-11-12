#!/usr/bin/env python3
"""Matsya Resource Ingestion Engine.

Scans an inbox directory of literature, footage, datasets, models, experiments,
design documents, presentations, and other project artifacts.
Deduplicates via SHA-256, extracts rich metadata, generates thumbnails and
video previews, applies privacy safeguards, and produces a published catalog.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
import yaml

# Sensitive keywords that force public: false
SENSITIVE_KEYWORDS = [
    "roll",
    "phone",
    "email",
    "marksheet",
    "certificate",
    "aadhaar",
    "password",
    "token",
    "key",
    ".env",
]

# Classification extensions & paths
CATEGORY_MAP = {
    "literature": [".pdf"],
    "footage": [".mp4", ".avi", ".mov", ".webm", ".mkv", ".m4v"],
    "datasets": [".csv", ".tsv", ".xlsx", ".xls", ".json", ".parquet"],
    "models": [".onnx", ".pt", ".pth", ".bin", ".h5", ".tflite", ".ipynb"],
    "design": [".drawio", ".uml", ".fig"],
    "presentations": [".pptx", ".ppt", ".key", ".docx", ".doc"],
}


def get_ffmpeg_cmd() -> str:
    """Find ffmpeg binary via imageio_ffmpeg or system path."""
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        # Fallback to local bin or PATH
        local_bin = Path(__file__).resolve().parent.parent / "bin" / "ffmpeg"
        if local_bin.exists():
            return str(local_bin)
        return "ffmpeg"


def compute_sha256(path: Path) -> str:
    """Compute hex SHA-256 of file contents."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def check_sensitive(path: Path, text: str = "") -> Tuple[bool, str]:
    """Check filename and text against sensitive keywords."""
    path_str = str(path).lower()
    text_lower = text.lower()
    for kw in SENSITIVE_KEYWORDS:
        if kw in path_str:
            return True, f"Filename contains sensitive token '{kw}'"
        if kw in text_lower:
            return True, f"Extracted text contains sensitive token '{kw}'"
    return False, ""


def classify_resource(path: Path) -> Tuple[str, str]:
    """Classify into category and concrete type."""
    ext = path.suffix.lower()
    p_lower = str(path).lower()

    # Determine type
    if ext == ".pdf":
        res_type = "pdf"
    elif ext in [".pptx", ".ppt", ".key"]:
        res_type = "slides"
    elif ext in [".docx", ".doc"]:
        res_type = "docx"
    elif ext in [".mp4", ".avi", ".mov", ".webm", ".mkv", ".m4v"]:
        res_type = "video"
    elif ext in [".png", ".jpg", ".jpeg", ".webp", ".svg"]:
        res_type = "image"
    elif ext in [".csv", ".tsv"]:
        res_type = "csv"
    elif ext in [".xlsx", ".xls"]:
        res_type = "xlsx"
    elif ext == ".ipynb":
        res_type = "notebook"
    elif ext in [".onnx", ".pt", ".pth", ".bin"]:
        res_type = "model"
    elif ext == ".zip":
        res_type = "zip"
    else:
        res_type = "other"

    # Determine category
    if "literature" in p_lower or "paper" in p_lower or "reference" in p_lower:
        category = "literature"
    elif "footage" in p_lower or "video" in p_lower or ext in CATEGORY_MAP["footage"]:
        category = "footage"
    elif "dataset" in p_lower or "annotation" in p_lower or ext in CATEGORY_MAP["datasets"]:
        category = "datasets"
    elif "model" in p_lower or "weight" in p_lower or ext in CATEGORY_MAP["models"]:
        category = "models"
    elif "experiment" in p_lower or "metric" in p_lower or "observation" in p_lower:
        category = "experiments"
    elif "design" in p_lower or "arch" in p_lower or "srs" in p_lower or "diagram" in p_lower:
        category = "design"
    elif "presentation" in p_lower or "deck" in p_lower or "slide" in p_lower or ext in [".pptx", ".ppt", ".key"]:
        category = "presentations"
    elif ext == ".pdf":
        category = "literature"
    elif ext in [".docx", ".doc"]:
        category = "presentations"
    else:
        category = "other"

    return category, res_type


def extract_metadata(
    path: Path, res_type: str, extracted_dir: Path
) -> Tuple[Dict[str, Any], str, str]:
    """Extract metadata, title, and raw text for the file."""
    metadata: Dict[str, Any] = {}
    title = path.stem.replace("_", " ").replace("-", " ").strip().title()
    description = ""
    extracted_text = ""

    try:
        if res_type == "pdf":
            try:
                import pypdf

                reader = pypdf.PdfReader(str(path))
                metadata["page_count"] = len(reader.pages)
                if reader.metadata and reader.metadata.title:
                    pdf_title = str(reader.metadata.title).strip()
                    if len(pdf_title) > 3:
                        title = pdf_title

                pages_text = []
                for p in reader.pages[:5]:
                    t = p.extract_text()
                    if t:
                        pages_text.append(t)
                extracted_text = "\n\n".join(pages_text)
                if extracted_text and not (reader.metadata and reader.metadata.title):
                    lines = [line.strip() for line in extracted_text.splitlines() if line.strip()]
                    if lines:
                        first_line = lines[0]
                        if 5 <= len(first_line) <= 120:
                            title = first_line
                description = f"Academic paper ({metadata['page_count']} pages)"
            except Exception as e:
                metadata["pdf_extract_error"] = str(e)

        elif res_type == "slides":
            try:
                import pptx

                prs = pptx.Presentation(str(path))
                metadata["slide_count"] = len(prs.slides)
                slide_titles = []
                all_text = []
                for i, slide in enumerate(prs.slides):
                    stitle = ""
                    if slide.shapes.title and slide.shapes.title.text:
                        stitle = slide.shapes.title.text.strip()
                        slide_titles.append(f"Slide {i+1}: {stitle}")
                    slide_texts = []
                    for shape in slide.shapes:
                        if hasattr(shape, "text") and shape.text:
                            slide_texts.append(shape.text.strip())
                    if slide_texts:
                        all_text.append(f"### Slide {i+1} {stitle}\n" + "\n".join(slide_texts))
                metadata["slide_titles"] = slide_titles
                extracted_text = "\n\n".join(all_text)
                if slide_titles:
                    first_clean = slide_titles[0].split(":", 1)[-1].strip()
                    if len(first_clean) > 3:
                        title = first_clean
                description = f"Presentation slide deck ({metadata['slide_count']} slides)"
            except Exception as e:
                metadata["pptx_extract_error"] = str(e)

        elif res_type == "docx":
            try:
                import docx

                doc = docx.Document(str(path))
                headings = [p.text.strip() for p in doc.paragraphs if p.style.name.startswith("Heading")]
                metadata["heading_count"] = len(headings)
                metadata["headings"] = headings[:10]
                text_list = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
                extracted_text = "\n\n".join(text_list)
                if headings:
                    title = headings[0]
                elif text_list and len(text_list[0]) < 100:
                    title = text_list[0]
                description = f"Project document ({len(doc.paragraphs)} paragraphs)"
            except Exception as e:
                metadata["docx_extract_error"] = str(e)

        elif res_type == "video":
            cap = cv2.VideoCapture(str(path))
            if cap.isOpened():
                fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
                frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
                dur = round(frame_count / fps, 2) if fps > 0 else 0.0
                w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                cap.release()
                metadata["fps"] = round(fps, 2)
                metadata["frame_count"] = int(frame_count)
                metadata["duration_s"] = dur
                metadata["dimensions"] = f"{w}x{h}"
                description = f"Video footage ({dur}s, {w}x{h} @ {round(fps, 1)} fps)"
            else:
                metadata["video_extract_error"] = "Could not open video file"

        elif res_type == "image":
            img = cv2.imread(str(path))
            if img is not None:
                h, w = img.shape[:2]
                metadata["dimensions"] = f"{w}x{h}"
                description = f"Image ({w}x{h} px)"

        elif res_type == "csv":
            import csv

            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                reader = csv.reader(f)
                rows = []
                for i, row in enumerate(reader):
                    if i < 21:
                        rows.append(row)
                    else:
                        break
                metadata["column_count"] = len(rows[0]) if rows else 0
                metadata["columns"] = rows[0] if rows else []
                metadata["preview_rows"] = rows[1:21] if len(rows) > 1 else []
                # Count total rows
                f.seek(0)
                total_rows = sum(1 for _ in f) - 1
                metadata["row_count"] = max(0, total_rows)
                description = f"Tabular dataset ({metadata['row_count']} rows, {metadata['column_count']} columns)"

        elif res_type == "xlsx":
            metadata["note"] = "Excel spreadsheet"
            description = "Excel spreadsheet"

        elif res_type == "notebook":
            try:
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    nb = json.load(f)
                    cells = nb.get("cells", [])
                    metadata["cell_count"] = len(cells)
                    for c in cells:
                        if c.get("cell_type") == "markdown":
                            src = "".join(c.get("source", []))
                            if src.startswith("#"):
                                title = src.splitlines()[0].lstrip("#").strip()
                                break
                    description = f"Jupyter notebook ({metadata['cell_count']} cells)"
            except Exception as e:
                metadata["nb_extract_error"] = str(e)

        elif res_type == "model":
            if path.suffix.lower() == ".onnx":
                try:
                    import onnx

                    model = onnx.load(str(path))
                    inputs = [inp.name for inp in model.graph.input]
                    outputs = [out.name for out in model.graph.output]
                    metadata["inputs"] = inputs
                    metadata["outputs"] = outputs
                    description = f"ONNX neural network model ({len(inputs)} inputs, {len(outputs)} outputs)"
                except Exception as e:
                    metadata["onnx_extract_error"] = str(e)
            else:
                description = f"Model weights binary ({path.suffix})"

        elif res_type == "zip":
            with zipfile.ZipFile(str(path), "r") as zf:
                infos = zf.infolist()
                metadata["file_count"] = len(infos)
                exts = list({Path(info.filename).suffix.lower() for info in infos if Path(info.filename).suffix})
                metadata["contained_extensions"] = exts
                description = f"Archive package ({len(infos)} files)"

    except Exception as e:
        metadata["general_error"] = str(e)

    # Save extracted text if present
    if extracted_text.strip():
        extracted_dir.mkdir(parents=True, exist_ok=True)
        txt_path = extracted_dir / f"{path.stem}.md"
        txt_path.write_text(f"# {title}\n\nSource: `{path.name}`\n\n{extracted_text}", encoding="utf-8")

    return metadata, title, description


def generate_thumbnail(path: Path, res_type: str, out_thumb: Path) -> bool:
    """Generate a thumbnail image for the resource."""
    out_thumb.parent.mkdir(parents=True, exist_ok=True)
    if out_thumb.exists():
        return True

    try:
        if res_type == "pdf":
            # Use pdftoppm
            prefix = out_thumb.parent / f"tmp_{out_thumb.stem}"
            res = subprocess.run(
                ["pdftoppm", "-r", "60", "-png", "-f", "1", "-l", "1", str(path), str(prefix)],
                capture_output=True,
                check=False,
            )
            # Find generated file: prefix-1.png or prefix-01.png
            candidates = list(out_thumb.parent.glob(f"tmp_{out_thumb.stem}-*.png"))
            if candidates:
                # Resize to max width 360
                img = cv2.imread(str(candidates[0]))
                if img is not None:
                    h, w = img.shape[:2]
                    target_w = 360
                    target_h = int(h * (target_w / w))
                    resized = cv2.resize(img, (target_w, target_h), interpolation=cv2.INTER_AREA)
                    cv2.imwrite(str(out_thumb), resized)
                for c in candidates:
                    try:
                        c.unlink()
                    except Exception:
                        pass
                return True

        elif res_type == "video":
            cap = cv2.VideoCapture(str(path))
            if cap.isOpened():
                fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
                frame_idx = int(fps * 1.0)
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()
                if not ret:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    ret, frame = cap.read()
                cap.release()
                if ret and frame is not None:
                    h, w = frame.shape[:2]
                    target_w = 360
                    target_h = int(h * (target_w / w))
                    resized = cv2.resize(frame, (target_w, target_h), interpolation=cv2.INTER_AREA)
                    cv2.imwrite(str(out_thumb), resized)
                    return True

        elif res_type == "image":
            img = cv2.imread(str(path))
            if img is not None:
                h, w = img.shape[:2]
                target_w = min(360, w)
                target_h = int(h * (target_w / w))
                resized = cv2.resize(img, (target_w, target_h), interpolation=cv2.INTER_AREA)
                cv2.imwrite(str(out_thumb), resized)
                return True

    except Exception as e:
        print(f"Thumbnail generation warning for {path.name}: {e}", file=sys.stderr)

    # Fallback placeholder thumbnail
    placeholder = np.zeros((200, 320, 3), dtype=np.uint8)
    # Deep ocean background
    placeholder[:] = (61, 42, 10)  # BGR #0A2A3D
    cv2.putText(
        placeholder,
        res_type.upper(),
        (40, 110),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.0,
        (197, 209, 79),  # BGR aqua #4FD1C5
        2,
        cv2.LINE_AA,
    )
    cv2.imwrite(str(out_thumb), placeholder)
    return True


def generate_video_preview(
    path: Path, out_preview: Path, max_local_mb: int = 15
) -> bool:
    """Generate a lightweight 20s, 480px H.264 preview for large videos."""
    out_preview.parent.mkdir(parents=True, exist_ok=True)
    if out_preview.exists():
        return True

    ffmpeg = get_ffmpeg_cmd()
    cmd = [
        ffmpeg,
        "-y",
        "-ss",
        "0",
        "-t",
        "20",
        "-i",
        str(path),
        "-vf",
        "scale=480:-2",
        "-c:v",
        "libx264",
        "-crf",
        "28",
        "-preset",
        "fast",
        "-c:a",
        "aac",
        "-b:a",
        "64k",
        "-movflags",
        "+faststart",
        str(out_preview),
    ]
    res = subprocess.run(cmd, capture_output=True, check=False)
    if res.returncode == 0 and out_preview.exists():
        return True
    return False


def run_ingestion(
    inbox_dir: Path,
    output_dir: Path,
    overrides_path: Path,
    report_path: Path,
    extracted_dir: Path,
    max_local_mb: int = 15,
) -> Dict[str, Any]:
    """Execute the complete ingestion workflow."""
    inbox_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    thumbs_dir = output_dir / "thumbs"
    previews_dir = output_dir / "previews"
    files_dir = output_dir / "files"
    thumbs_dir.mkdir(parents=True, exist_ok=True)
    previews_dir.mkdir(parents=True, exist_ok=True)
    files_dir.mkdir(parents=True, exist_ok=True)

    # 1. Walk inbox and deduplicate by SHA-256
    hash_to_paths: Dict[str, List[Path]] = {}
    for p in sorted(inbox_dir.rglob("*")):
        if p.is_file() and not p.name.startswith("."):
            h = compute_sha256(p)
            hash_to_paths.setdefault(h, []).append(p)

    deduped_files: List[Tuple[str, Path, List[Path]]] = []
    duplicates_list: List[Tuple[Path, Path]] = []
    for h, paths in hash_to_paths.items():
        # Keep path with shortest string
        paths_sorted = sorted(paths, key=lambda x: (len(str(x)), str(x)))
        canonical = paths_sorted[0]
        duplicates = paths_sorted[1:]
        deduped_files.append((h, canonical, duplicates))
        for dup in duplicates:
            duplicates_list.append((canonical, dup))

    # 2. Load existing overrides if present
    existing_overrides: Dict[str, Any] = {}
    if overrides_path.exists():
        try:
            with open(overrides_path, "r", encoding="utf-8") as f:
                loaded = yaml.safe_load(f)
                if isinstance(loaded, dict):
                    existing_overrides = loaded
        except Exception as e:
            print(f"Warning: could not parse existing overrides: {e}", file=sys.stderr)

    # 3. Process each canonical file
    updated_overrides: Dict[str, Any] = {}
    catalog_items: List[Dict[str, Any]] = []
    sensitive_items: List[Dict[str, Any]] = []
    all_scanned: List[Dict[str, Any]] = []

    for h, path, dups in deduped_files:
        res_id = h[:12]
        size_bytes = path.stat().st_size
        category, res_type = classify_resource(path)
        metadata, extracted_title, extracted_desc = extract_metadata(path, res_type, extracted_dir)

        # Check sensitivity
        is_sensitive, sensitive_reason = check_sensitive(path, metadata.get("extracted_text", ""))

        # Check existing override
        override = existing_overrides.get(res_id, {})

        # Preserved fields
        title = override.get("title") or extracted_title
        description = override.get("description") or extracted_desc
        final_category = override.get("category") or category
        final_type = override.get("type") or res_type
        tags = override.get("tags") or [final_category, final_type]
        author = override.get("author") or "Matsya Project Team"
        year = override.get("year") or 2026
        source_url = override.get("source_url")
        external_url = override.get("external_url")
        featured = bool(override.get("featured", False))

        # Privacy rule: all start with public: false; sensitive forced to false
        if is_sensitive:
            public_flag = False
        else:
            public_flag = bool(override.get("public", False))

        # Save to updated overrides
        updated_overrides[res_id] = {
            "id": res_id,
            "title": title,
            "description": description,
            "category": final_category,
            "type": final_type,
            "tags": tags,
            "author": author,
            "year": year,
            "source_url": source_url,
            "external_url": external_url,
            "featured": featured,
            "public": public_flag,
            "sensitive": is_sensitive,
            "canonical_file": path.name,
            "size_bytes": size_bytes,
        }

        # Thumbnails & Previews
        thumb_file = thumbs_dir / f"{res_id}.png"
        has_thumb = generate_thumbnail(path, res_type, thumb_file)

        has_preview = False
        preview_file = previews_dir / f"{res_id}.mp4"
        if res_type == "video":
            if size_bytes > (max_local_mb * 1024 * 1024):
                has_preview = generate_video_preview(path, preview_file, max_local_mb)
            else:
                # Small video can be copied or previewed
                has_preview = generate_video_preview(path, preview_file, max_local_mb)
        elif res_type in ["pdf", "image"]:
            has_preview = True

        # Copy file if public
        has_file = False
        if public_flag:
            target_ext = path.suffix.lower()
            pub_file = files_dir / f"{res_id}{target_ext}"
            if not pub_file.exists():
                shutil.copy2(path, pub_file)
            has_file = True

            catalog_items.append(
                {
                    "id": res_id,
                    "title": title,
                    "description": description,
                    "category": final_category,
                    "type": final_type,
                    "tags": tags,
                    "author": author,
                    "year": year,
                    "size_bytes": size_bytes,
                    "duration_s": metadata.get("duration_s"),
                    "dimensions": metadata.get("dimensions"),
                    "source_url": source_url,
                    "external_url": external_url,
                    "featured": featured,
                    "has_file": has_file,
                    "has_preview": has_preview,
                    "has_thumb": has_thumb,
                    "metadata": metadata,
                }
            )

        item_summary = {
            "id": res_id,
            "filename": path.name,
            "path": str(path.relative_to(inbox_dir.parent) if path.is_relative_to(inbox_dir.parent) else path),
            "category": final_category,
            "type": final_type,
            "size_bytes": size_bytes,
            "public": public_flag,
            "sensitive": is_sensitive,
            "reason": sensitive_reason,
            "duplicates_count": len(dups),
        }
        all_scanned.append(item_summary)
        if is_sensitive:
            sensitive_items.append(item_summary)

    # 3b. Retain external-only or manually curated items from existing overrides
    for ext_id, ext_item in existing_overrides.items():
        if ext_id not in updated_overrides:
            updated_overrides[ext_id] = ext_item
            if ext_item.get("public"):
                catalog_items.append(
                    {
                        "id": ext_id,
                        "title": ext_item.get("title", f"Resource {ext_id}"),
                        "description": ext_item.get("description", ""),
                        "category": ext_item.get("category", "other"),
                        "type": ext_item.get("type", "other"),
                        "tags": ext_item.get("tags", []),
                        "author": ext_item.get("author", "Matsya Project Team"),
                        "year": ext_item.get("year", 2026),
                        "size_bytes": ext_item.get("size_bytes", 0),
                        "duration_s": ext_item.get("duration_s"),
                        "dimensions": ext_item.get("dimensions"),
                        "source_url": ext_item.get("source_url"),
                        "external_url": ext_item.get("external_url"),
                        "featured": bool(ext_item.get("featured", False)),
                        "has_file": False,
                        "has_preview": False,
                        "has_thumb": False,
                        "metadata": ext_item.get("metadata", {}),
                    }
                )

    # 4. Write overrides.yaml
    overrides_path.parent.mkdir(parents=True, exist_ok=True)
    with open(overrides_path, "w", encoding="utf-8") as f:
        yaml.dump(updated_overrides, f, sort_keys=True, allow_unicode=True)

    # 5. Write catalog.json
    catalog_path = output_dir / "catalog.json"
    catalog_path.write_text(json.dumps(catalog_items, indent=2), encoding="utf-8")

    # 6. Write report markdown
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_lines = [
        "# Matsya Resource Ingestion Report",
        "",
        f"- **Generated At:** {datetime.now(timezone.utc).isoformat()}",
        f"- **Inbox Directory:** `{inbox_dir}`",
        f"- **Total Scanned Files:** {len(deduped_files) + len(duplicates_list)}",
        f"- **Unique Artifacts:** {len(deduped_files)}",
        f"- **Duplicates Detected:** {len(duplicates_list)}",
        f"- **Sensitive / Flagged Artifacts:** {len(sensitive_items)}",
        f"- **Published Items (`public: true`):** {len(catalog_items)}",
        "",
        "## Review Before Publishing (Sensitive Detection)",
        "",
    ]

    if sensitive_items:
        report_lines.append("| ID | File | Flag Reason | Forced Public Status |")
        report_lines.append("|---|---|---|---|")
        for s in sensitive_items:
            report_lines.append(f"| `{s['id']}` | `{s['filename']}` | {s['reason']} | `public: false` |")
    else:
        report_lines.append("No sensitive tokens detected in scanned artifacts.")

    report_lines.extend(["", "## Duplicate Files Detected", ""])
    if duplicates_list:
        report_lines.append("| Canonical File (Retained) | Duplicate File Path |")
        report_lines.append("|---|---|")
        for canon, dup in duplicates_list:
            report_lines.append(f"| `{canon.name}` | `{dup}` |")
    else:
        report_lines.append("No duplicate files encountered.")

    report_lines.extend(["", "## Catalog Inventory", ""])
    report_lines.append("| ID | Category | Type | Title | Size | Public |")
    report_lines.append("|---|---|---|---|---|---|")
    for item in all_scanned:
        kb = round(item["size_bytes"] / 1024, 1)
        report_lines.append(
            f"| `{item['id']}` | {item['category']} | {item['type']} | {item['filename']} | {kb} KB | `{str(item['public']).lower()}` |"
        )

    report_path.write_text("\n".join(report_lines) + "\n", encoding="utf-8")

    return {
        "scanned_total": len(deduped_files) + len(duplicates_list),
        "unique_total": len(deduped_files),
        "duplicates_count": len(duplicates_list),
        "sensitive_count": len(sensitive_items),
        "published_count": len(catalog_items),
        "catalog_path": str(catalog_path),
        "report_path": str(report_path),
        "overrides_path": str(overrides_path),
    }


def main():
    parser = argparse.ArgumentParser(description="Matsya Resource Ingestion Engine")
    parser.add_argument("--inbox", default="resources_inbox", help="Path to inbox directory")
    parser.add_argument(
        "--output-dir", default="backend/resources_public", help="Path to public output directory"
    )
    parser.add_argument(
        "--overrides", default="resources/overrides.yaml", help="Path to overrides.yaml file"
    )
    parser.add_argument(
        "--report", default=".work/resources_report.md", help="Path to resources report markdown"
    )
    parser.add_argument(
        "--extracted", default=".work/extracted", help="Path to extracted markdown dir"
    )
    parser.add_argument(
        "--max-local-mb", type=int, default=15, help="Max MB before video preview generation"
    )
    args = parser.parse_args()

    root = Path.cwd()
    inbox = Path(args.inbox) if Path(args.inbox).is_absolute() else root / args.inbox
    out_dir = Path(args.output_dir) if Path(args.output_dir).is_absolute() else root / args.output_dir
    overrides = Path(args.overrides) if Path(args.overrides).is_absolute() else root / args.overrides
    report = Path(args.report) if Path(args.report).is_absolute() else root / args.report
    extracted = Path(args.extracted) if Path(args.extracted).is_absolute() else root / args.extracted

    res = run_ingestion(
        inbox_dir=inbox,
        output_dir=out_dir,
        overrides_path=overrides,
        report_path=report,
        extracted_dir=extracted,
        max_local_mb=args.max_local_mb,
    )

    print(f"Ingestion complete: {res['unique_total']} unique files processed.")
    print(f"Catalog published at: {res['catalog_path']} ({res['published_count']} public items)")
    print(f"Report written to: {res['report_path']}")


if __name__ == "__main__":
    main()
