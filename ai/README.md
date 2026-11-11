# AI Model Integration Directory

This directory is designated for the AI/ML research team. It provides the integration hooks to connect your trained deep learning models into **AI Meets Aqua**.

## Integration Guide
For the full technical specification, Python function contracts, and Tracks JSON schema, please refer to:
👉 [docs/AI_INTEGRATION.md](../docs/AI_INTEGRATION.md)

## Quick Summary
To integrate your custom model:
1. Implement either `detect_and_track(video_path, progress_cb=None)` or `analyze_video(video_path, progress_cb=None)` in `ai/pipeline.py`.
2. Configure the backend environment:
   ```bash
   export ANALYZER=external
   export AI_MODULE=ai.pipeline
   ```
3. Run the verification test suite:
   ```bash
   cd backend && pytest -k external
   ```
