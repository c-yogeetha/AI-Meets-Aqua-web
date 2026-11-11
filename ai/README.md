# AI Model Package

This folder is reserved for the AI team's goldfish detection and tracking model.

Please refer to [`docs/AI_INTEGRATION.md`](../docs/AI_INTEGRATION.md) for the contract specifications:
- Tracks JSON format
- Preferred entry point: `detect_and_track(video_path: str, progress_cb) -> dict`
- Alternative entry point: `analyze_video(video_path: str, meta: dict, progress_cb, out_dir: str) -> dict`
- Activation: Set `ANALYZER=external` and `AI_MODULE=ai.pipeline` in `.env`
