import os
import subprocess
import tempfile
from pathlib import Path
import pytest
import imageio_ffmpeg
from app.analysis.video_io import probe_video_stream, normalize_video_on_ingest

@pytest.fixture
def ffmpeg_exe():
    return imageio_ffmpeg.get_ffmpeg_exe()

def test_b_norm01_compliant_file_untouched(ffmpeg_exe, tmp_path):
    """B-NORM01: Files already complying (720p H.264, 25fps, 0 rotation) are untouched."""
    fpath = tmp_path / "compliant.mp4"
    subprocess.run([
        ffmpeg_exe, "-y", "-t", "1", "-f", "lavfi", "-i", "testsrc=size=640x360:rate=25",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", str(fpath)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    orig_mtime = fpath.stat().st_mtime
    norm_result = normalize_video_on_ingest(str(fpath))
    assert norm_result == str(fpath)
    assert fpath.stat().st_mtime == orig_mtime

def test_b_norm02_4k_scaled_to_max_1280(ffmpeg_exe, tmp_path):
    """B-NORM02: 4K video is scaled down to long side at most 1280."""
    fpath = tmp_path / "huge_4k.mp4"
    subprocess.run([
        ffmpeg_exe, "-y", "-t", "1", "-f", "lavfi", "-i", "testsrc=size=3840x2160:rate=25",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", str(fpath)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    norm_result = normalize_video_on_ingest(str(fpath))
    probe = probe_video_stream(norm_result)
    assert max(probe["width"], probe["height"]) <= 1280
    assert probe["codec"] == "h264"

def test_b_norm03_portrait_rotation_handled(ffmpeg_exe, tmp_path):
    """B-NORM03: Portrait phone video with rotation tag is normalized without rotation flag."""
    fpath = tmp_path / "rot.mp4"
    subprocess.run([
        ffmpeg_exe, "-y", "-t", "1", "-f", "lavfi", "-i", "testsrc=size=1920x1080:rate=25",
        "-metadata:s:v:0", "rotate=90", "-c:v", "libx264", "-pix_fmt", "yuv420p", str(fpath)
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    norm_result = normalize_video_on_ingest(str(fpath))
    probe = probe_video_stream(norm_result)
    assert probe["rotation"] == 0
    assert max(probe["width"], probe["height"]) <= 1280

def test_b_norm04_corrupt_rejected_cleanly(tmp_path):
    """B-NORM04: Corrupt or invalid video data is detected without unhandled crash."""
    fpath = tmp_path / "corrupt.mp4"
    fpath.write_bytes(b"INVALID_HEADER_GARBAGE_BYTES")
    probe = probe_video_stream(str(fpath))
    assert not probe["has_video"]
