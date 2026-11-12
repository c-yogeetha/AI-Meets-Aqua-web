import json
import shutil
import sys
import zipfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import cv2
import docx
import numpy as np
import pptx
import pytest
import yaml
from fastapi.testclient import TestClient
from reportlab.pdfgen import canvas
from scripts.ingest_resources import run_ingestion

from app.config import Settings
from app.main import app


@pytest.fixture
def resource_fixture_inbox(tmp_path: Path) -> Path:
    """Create a multi-format fixture inbox covering all classification types."""
    inbox = tmp_path / "inbox"
    inbox.mkdir(parents=True)

    # 1. Literature PDF
    pdf_path = inbox / "papers" / "goldfish_locomotion_study.pdf"
    pdf_path.parent.mkdir(parents=True)
    c = canvas.Canvas(str(pdf_path))
    c.setTitle("Quantifying Aquatic Goldfish Kinematics")
    c.drawString(100, 750, "Quantifying Aquatic Goldfish Kinematics")
    c.drawString(100, 720, "Behavioural observation under varied conditions.")
    c.showPage()
    c.save()

    # 2. Presentations PPTX
    pptx_path = inbox / "decks" / "matsya_overview_deck.pptx"
    pptx_path.parent.mkdir(parents=True)
    prs = pptx.Presentation()
    slide = prs.slides.add_slide(prs.slide_layouts[0])
    slide.shapes.title.text = "Matsya Project Architecture"
    prs.save(str(pptx_path))

    # 3. Design DOCX
    docx_path = inbox / "specs" / "system_design_specification.docx"
    docx_path.parent.mkdir(parents=True)
    doc = docx.Document()
    doc.add_heading("System Architecture Document", level=1)
    doc.add_paragraph("This document outlines the pipeline layers.")
    doc.save(str(docx_path))

    # 4. Datasets CSV
    csv_path = inbox / "data" / "trajectories.csv"
    csv_path.parent.mkdir(parents=True)
    csv_path.write_text("frame,fish_id,x,y,speed_bl_s\n1,1,120,200,1.2\n2,1,122,201,1.1\n", encoding="utf-8")

    # 5. Footage MP4 (copy from samples)
    video_path = inbox / "footage" / "short_clip.mp4"
    video_path.parent.mkdir(parents=True)
    sample_mp4 = Path("samples/calm.mp4")
    if sample_mp4.exists():
        shutil.copy2(sample_mp4, video_path)
    else:
        # Generate dummy 1-second video
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(str(video_path), fourcc, 10.0, (320, 240))
        for _ in range(10):
            writer.write(np.zeros((240, 320, 3), dtype=np.uint8))
        writer.release()

    # 6. Image PNG
    img_path = inbox / "images" / "tank_setup.png"
    img_path.parent.mkdir(parents=True)
    cv2.imwrite(str(img_path), np.full((120, 160, 3), 128, dtype=np.uint8))

    # 7. ZIP archive
    zip_path = inbox / "archives" / "annotation_bundle.zip"
    zip_path.parent.mkdir(parents=True)
    with zipfile.ZipFile(str(zip_path), "w") as zf:
        zf.writestr("notes.txt", "Bounding box coordinates")

    # 8. Duplicate file (longer path)
    dup_path = inbox / "data" / "nested" / "deep_folder" / "duplicate_trajectories.csv"
    dup_path.parent.mkdir(parents=True)
    shutil.copy2(csv_path, dup_path)

    # 9. Sensitive file (forced public: false)
    sens_path = inbox / "confidential" / "student_marksheet_and_phone.pdf"
    sens_path.parent.mkdir(parents=True)
    c_sens = canvas.Canvas(str(sens_path))
    c_sens.drawString(100, 750, "Internal Assessment and Contact Phone Number")
    c_sens.showPage()
    c_sens.save()

    return inbox


def test_b_res01_ingestion_fixtures(resource_fixture_inbox: Path, tmp_path: Path):
    """B-RES01: Ingestion on fixture inbox categorizes, deduplicates, and enforces privacy."""
    out_dir = tmp_path / "resources_public"
    overrides_path = tmp_path / "overrides.yaml"
    report_path = tmp_path / "resources_report.md"
    extracted_dir = tmp_path / "extracted"

    res = run_ingestion(
        inbox_dir=resource_fixture_inbox,
        output_dir=out_dir,
        overrides_path=overrides_path,
        report_path=report_path,
        extracted_dir=extracted_dir,
        max_local_mb=15,
    )

    # Duplicates reported
    assert res["duplicates_count"] == 1
    # 9 files total, 8 unique
    assert res["unique_total"] == 8

    # All start with public: false by default
    assert res["published_count"] == 0

    # Overrides yaml created
    assert overrides_path.exists()
    with open(overrides_path, "r", encoding="utf-8") as f:
        overrides = yaml.safe_load(f)

    # Sensitive item detected and forced public: false
    sens_items = [v for v in overrides.values() if v.get("sensitive")]
    assert len(sens_items) >= 1
    for s in sens_items:
        assert s["public"] is False

    # Check categories in overrides
    categories = {v["category"] for v in overrides.values()}
    assert "literature" in categories
    assert "presentations" in categories
    assert "datasets" in categories
    assert "footage" in categories

    # Report generated
    assert report_path.exists()
    report_text = report_path.read_text(encoding="utf-8")
    assert "Duplicate Files Detected" in report_text
    assert "Review Before Publishing" in report_text


def test_b_res02_idempotency_preserves_overrides(resource_fixture_inbox: Path, tmp_path: Path):
    """B-RES02: Ingestion is idempotent and preserves user-configured overrides."""
    out_dir = tmp_path / "resources_public"
    overrides_path = tmp_path / "overrides.yaml"
    report_path = tmp_path / "resources_report.md"
    extracted_dir = tmp_path / "extracted"

    # Run 1: initial ingestion
    run_ingestion(
        inbox_dir=resource_fixture_inbox,
        output_dir=out_dir,
        overrides_path=overrides_path,
        report_path=report_path,
        extracted_dir=extracted_dir,
    )

    # Flip one clean item to public: true and edit its title
    with open(overrides_path, "r", encoding="utf-8") as f:
        overrides = yaml.safe_load(f)

    non_sens_id = next(k for k, v in overrides.items() if not v.get("sensitive") and v.get("category") == "literature")
    overrides[non_sens_id]["public"] = True
    overrides[non_sens_id]["title"] = "Curated Goldfish Locomotion Benchmark"
    overrides[non_sens_id]["featured"] = True

    with open(overrides_path, "w", encoding="utf-8") as f:
        yaml.dump(overrides, f)

    # Run 2: re-run ingestion
    res2 = run_ingestion(
        inbox_dir=resource_fixture_inbox,
        output_dir=out_dir,
        overrides_path=overrides_path,
        report_path=report_path,
        extracted_dir=extracted_dir,
    )

    # Published count is now 1
    assert res2["published_count"] == 1

    # Overrides preserved
    with open(overrides_path, "r", encoding="utf-8") as f:
        overrides2 = yaml.safe_load(f)

    assert overrides2[non_sens_id]["public"] is True
    assert overrides2[non_sens_id]["title"] == "Curated Goldfish Locomotion Benchmark"
    assert overrides2[non_sens_id]["featured"] is True

    # Catalog.json reflects published item
    catalog = json.loads((out_dir / "catalog.json").read_text(encoding="utf-8"))
    assert len(catalog) == 1
    assert catalog[0]["id"] == non_sens_id
    assert catalog[0]["title"] == "Curated Goldfish Locomotion Benchmark"
    assert catalog[0]["featured"] is True


def test_b_res03_resource_endpoints(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """B-RES03: Endpoints support filters, search, pagination, 404, traversal protection, MIME types, and Range 206."""
    out_dir = tmp_path / "resources_public"
    out_dir.mkdir(parents=True)
    files_dir = out_dir / "files"
    thumbs_dir = out_dir / "thumbs"
    previews_dir = out_dir / "previews"
    files_dir.mkdir(parents=True)
    thumbs_dir.mkdir(parents=True)
    previews_dir.mkdir(parents=True)

    # Populate catalog with 3 items
    item_pdf = {
        "id": "abc123456789",
        "title": "Goldfish Welfare Assessment Review",
        "description": "Comprehensive review of non-invasive stress signals",
        "category": "literature",
        "type": "pdf",
        "tags": ["welfare", "review"],
        "author": "Matsya Project Team",
        "year": 2026,
        "size_bytes": 1024,
        "duration_s": None,
        "dimensions": None,
        "source_url": "https://example.org/paper",
        "external_url": None,
        "featured": True,
        "has_file": True,
        "has_preview": True,
        "has_thumb": True,
        "metadata": {"page_count": 12},
    }
    item_video = {
        "id": "def123456789",
        "title": "Calm Goldfish Basal Locomotion",
        "description": "Side-view baseline swimming patterns",
        "category": "footage",
        "type": "video",
        "tags": ["locomotion", "baseline"],
        "author": "Matsya Team",
        "year": 2026,
        "size_bytes": 2048,
        "duration_s": 10.0,
        "dimensions": "1280x720",
        "source_url": None,
        "external_url": None,
        "featured": False,
        "has_file": True,
        "has_preview": True,
        "has_thumb": True,
        "metadata": {"fps": 25.0},
    }
    item_csv = {
        "id": "ghi123456789",
        "title": "Kinematic Velocity Timeseries",
        "description": "Raw extracted coordinates and body-length velocities",
        "category": "datasets",
        "type": "csv",
        "tags": ["velocity", "timeseries"],
        "author": "Matsya Team",
        "year": 2025,
        "size_bytes": 512,
        "duration_s": None,
        "dimensions": None,
        "source_url": None,
        "external_url": None,
        "featured": False,
        "has_file": True,
        "has_preview": False,
        "has_thumb": False,
        "metadata": {"row_count": 100, "column_count": 4},
    }

    catalog = [item_pdf, item_video, item_csv]
    (out_dir / "catalog.json").write_text(json.dumps(catalog), encoding="utf-8")

    # Create dummy files
    (files_dir / "abc123456789.pdf").write_bytes(b"%PDF-1.4 dummy pdf content")
    (thumbs_dir / "abc123456789.png").write_bytes(b"\x89PNG\r\n\x1a\n dummy png")
    (files_dir / "def123456789.mp4").write_bytes(b"0123456789" * 100)
    (previews_dir / "def123456789.mp4").write_bytes(b"0123456789" * 100)

    monkeypatch.setattr(Settings, "resources_public_path", property(lambda self: out_dir))
    client = TestClient(app)

    # 1. List all
    res = client.get("/api/v1/resources")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 3
    assert len(data["items"]) == 3
    assert data["categories"]["literature"] == 1
    assert data["categories"]["footage"] == 1

    # 2. Filter by category
    res = client.get("/api/v1/resources?category=literature")
    assert res.status_code == 200
    assert res.json()["total"] == 1
    assert res.json()["items"][0]["id"] == "abc123456789"

    # 3. Filter by featured
    res = client.get("/api/v1/resources?featured=true")
    assert res.status_code == 200
    assert res.json()["total"] == 1
    assert res.json()["items"][0]["id"] == "abc123456789"

    # 4. Search q
    res = client.get("/api/v1/resources?q=locomotion")
    assert res.status_code == 200
    assert res.json()["total"] == 1
    assert res.json()["items"][0]["id"] == "def123456789"

    # 5. Pagination
    res = client.get("/api/v1/resources?page=1&page_size=2")
    assert res.status_code == 200
    assert len(res.json()["items"]) == 2
    assert res.json()["total"] == 3

    # 6. Get single resource
    res = client.get("/api/v1/resources/abc123456789")
    assert res.status_code == 200
    assert res.json()["title"] == "Goldfish Welfare Assessment Review"

    # 7. Single resource 404
    res = client.get("/api/v1/resources/nonexistent123")
    assert res.status_code == 404

    # 8. Traversal prevention
    res = client.get("/api/v1/resources/..%2F..%2Fetc%2Fpasswd")
    assert res.status_code in [400, 404]

    # 9. Download attachment
    res = client.get("/api/v1/resources/abc123456789/file")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert "attachment" in res.headers["content-disposition"]

    # 10. Preview inline & Range 206
    res = client.get("/api/v1/resources/def123456789/preview", headers={"Range": "bytes=0-49"})
    assert res.status_code == 206
    assert res.headers["content-range"] == "bytes 0-49/1000"
    assert len(res.content) == 50

    # 11. Thumbnail
    res = client.get("/api/v1/resources/abc123456789/thumb")
    assert res.status_code == 200
    assert res.headers["content-type"] == "image/png"


def test_b_res04_large_video_preview(tmp_path: Path):
    """B-RES04: Videos over max_local_mb get a generated preview under 6 MB."""
    sample_mp4 = Path("samples/calm.mp4")
    if not sample_mp4.exists():
        pytest.skip("samples/calm.mp4 not present")

    out_preview = tmp_path / "previews" / "test_preview.mp4"
    from scripts.ingest_resources import generate_video_preview

    # Generate preview
    success = generate_video_preview(sample_mp4, out_preview, max_local_mb=1)
    assert success is True
    assert out_preview.exists()
    size_mb = out_preview.stat().st_size / (1024 * 1024)
    assert size_mb < 6.0
