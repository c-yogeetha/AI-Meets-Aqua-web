# Large video uploads in Next.js development

The default Next.js rewrite proxy limits proxied request bodies to 10 MB in this project version. Aquarium videos can be larger, so `/api/*` requests now pass through a streaming Route Handler at `frontend/src/app/api/[...path]/route.ts`.

The handler forwards the incoming request stream to `API_ORIGIN` (default `http://127.0.0.1:8000`) without buffering the complete multipart body in Next.js. In deployments, set `API_ORIGIN` to the backend service address, as with the previous rewrite configuration.

Do not add a second `/api` rewrite or read the request with `request.formData()` in this proxy; either can reintroduce buffering/body-size problems.

For local offline analysis, run from `backend/` so the `app` package is importable:

```bash
cd backend
python -m pip install -r requirements.txt
python ../scripts/analyse_local_video.py /path/to/fish.mp4
```

The script uses the project's configured `auto` detector selection, existing tracking, scoring, suggestions and annotated-video renderer. Until the ONNX model's independent validation gate passes, `auto` intentionally falls back to the classical detector. Scores are behavioural indicators, not veterinary diagnoses.
