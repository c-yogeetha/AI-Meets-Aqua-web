from app.analysis.tracks_mock import generate_mock_tracks


def detect_and_track(video_path: str, progress_cb=None) -> dict:
    if progress_cb:
        progress_cb("detecting", 30)
        progress_cb("tracking", 55)
    tracks = generate_mock_tracks(video_path=video_path, goldfish_count=2, duration_s=10.0, fps=10.0, width=640, height=360)
    return tracks.to_dict()
