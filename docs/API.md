# AI Meets Aqua - REST API Reference

The AI Meets Aqua backend is powered by **FastAPI** and provides standard REST endpoints.
All API responses follow standard HTTP semantics and error formats.

**Base URL**: `http://localhost:8000/api/v1`  
**Interactive OpenAPI UI**: `http://localhost:8000/docs`  
**Raw OpenAPI JSON**: `http://localhost:8000/openapi.json`  

---

## Standard Error Response Envelope
When an error occurs, the API returns a structured JSON payload:
```json
{
  "error": {
    "code": "resource_not_found",
    "message": "The requested tank could not be found.",
    "details": {}
  }
}
```

---

## 1. System Endpoints

### 1.1 Health Check
- **Method**: `GET /health`
- **Summary**: Basic service liveness check.
- **Response**: `200 OK`
```json
{
  "status": "ok",
  "version": "1.0.0"
}
```
**Example**:
```bash
curl -X GET http://localhost:8000/health
```

### 1.2 System Status
- **Method**: `GET /api/v1/system/status`
- **Summary**: Returns active analyzer mode, queue status, and version.
- **Response**: `200 OK`
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "analyzer": "baseline",
  "worker_queue_depth": 0
}
```
**Example**:
```bash
curl -X GET http://localhost:8000/api/v1/system/status
```

---

## 2. Tanks Management

### 2.1 List Tanks
- **Method**: `GET /api/v1/tanks`
- **Summary**: Retrieve all registered aquarium tanks.
- **Response**: `200 OK`
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Community Tank 60L",
    "volume_l": 60.0,
    "goldfish_count": 3,
    "water_temp_c": 22.5,
    "created_at": "2026-11-12T00:00:00Z"
  }
]
```
**Example**:
```bash
curl -X GET http://localhost:8000/api/v1/tanks
```

### 2.2 Create Tank
- **Method**: `POST /api/v1/tanks`
- **Summary**: Register a new aquarium tank.
- **Request Body**:
```json
{
  "name": "Breeding Tank A",
  "volume_l": 100.0,
  "goldfish_count": 4,
  "water_temp_c": 21.0
}
```
- **Response**: `201 Created`
**Example**:
```bash
curl -X POST http://localhost:8000/api/v1/tanks \
  -H "Content-Type: application/json" \
  -d '{"name": "Breeding Tank A", "volume_l": 100.0, "goldfish_count": 4, "water_temp_c": 21.0}'
```

### 2.3 Get Tank Details
- **Method**: `GET /api/v1/tanks/{id}`
- **Response**: `200 OK` or `404 Not Found`
**Example**:
```bash
curl -X GET http://localhost:8000/api/v1/tanks/550e8400-e29b-41d4-a716-446655440000
```

### 2.4 Update Tank
- **Method**: `PUT /api/v1/tanks/{id}`
- **Response**: `200 OK` or `404 Not Found`
**Example**:
```bash
curl -X PUT http://localhost:8000/api/v1/tanks/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{"name": "Community Tank 75L", "volume_l": 75.0, "goldfish_count": 4, "water_temp_c": 23.0}'
```

### 2.5 Delete Tank
- **Method**: `DELETE /api/v1/tanks/{id}`
- **Response**: `204 No Content` or `404 Not Found`
**Example**:
```bash
curl -X DELETE http://localhost:8000/api/v1/tanks/550e8400-e29b-41d4-a716-446655440000
```

---

## 3. Video Upload & Job Processing

### 3.1 Upload Video
- **Method**: `POST /api/v1/videos`
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file`: MP4, MOV, or WebM video file (Max 100 MB).
  - `tank_id`: UUID of the associated tank.
  - `view`: `side` | `front` | `top` (Default: `side`).
  - `water_temp_c`: (Optional) Float.
  - `last_water_change_days`: (Optional) Integer.
  - `last_fed_hours`: (Optional) Integer.
- **Response**: `202 Accepted`
```json
{
  "job_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "video_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
}
```
**Example**:
```bash
curl -X POST http://localhost:8000/api/v1/videos \
  -F "file=@samples/stressed_one.mp4" \
  -F "tank_id=550e8400-e29b-41d4-a716-446655440000" \
  -F "view=side"
```

### 3.2 Poll Job Status
- **Method**: `GET /api/v1/jobs/{id}`
- **Response**: `200 OK`
```json
{
  "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "video_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "tank_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "stage": "tracking",
  "progress": 60,
  "error": null,
  "analyzer": "baseline",
  "created_at": "2026-11-12T01:00:00Z",
  "finished_at": null
}
```
**Example**:
```bash
curl -X GET http://localhost:8000/api/v1/jobs/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
```

---

## 4. Analysis Results

### 4.1 Get Full Result
- **Method**: `GET /api/v1/results/{id}`
- **Response**: `200 OK` (or `409 Conflict` if processing, `410 Gone` if deleted).
```json
{
  "job_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "mode": "baseline",
  "tank": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Community Tank 60L",
    "goldfish_count": 3
  },
  "created_at": "2026-11-12T01:00:15Z",
  "analysis_time_s": 8.4,
  "video": {
    "duration_s": 15.0,
    "fps": 15.0,
    "width": 640,
    "height": 360,
    "view": "side"
  },
  "tank_score": 68,
  "level": "High",
  "threshold": 35,
  "fish": [
    {
      "id": "Fish_1",
      "score": 68,
      "stressed": true,
      "flags": ["fast_swimming", "erratic_swimming"],
      "metrics": {
        "speed_bl_s": 4.2,
        "direction_change_rate": 1.1,
        "isolation_ratio": 0.0,
        "surface_ratio": 0.1,
        "bottom_ratio": 0.05,
        "inactivity_ratio": 0.0
      },
      "explanation": "Fish_1 swam at high velocities with frequent directional changes.",
      "timeline": [{"t": 0.0, "score": 25}, {"t": 5.0, "score": 68}]
    }
  ],
  "timeline": [{"t": 0.0, "score": 25}, {"t": 5.0, "score": 68}],
  "key_moments": [
    {
      "t": 5.0,
      "fish": "Fish_1",
      "behaviour": "fast_swimming",
      "label": "High speed darting",
      "frame_url": "/api/v1/results/9b1deb4d.../frames/keyframe_0.jpg"
    }
  ],
  "suggestions": [
    {
      "priority": "high",
      "fish": ["Fish_1"],
      "behaviour": "fast_swimming",
      "cause": "Acute water parameter shift, ammonia spike or fright",
      "action": "Test ammonia, nitrite, and pH immediately; verify tank aeration.",
      "source": "rules.yaml#fast_swimming"
    }
  ],
  "warnings": [],
  "annotated_video_url": "/api/v1/results/9b1deb4d.../video",
  "disclaimer": "Behavioral indicator to support caretaker decisions; not a veterinary diagnosis."
}
```
**Example**:
```bash
curl -X GET http://localhost:8000/api/v1/results/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
```

### 4.2 Stream Annotated Video
- **Method**: `GET /api/v1/results/{id}/video`
- **Supports**: HTTP 206 Partial Content Range Requests for fast video seeking.
**Example**:
```bash
curl -X GET http://localhost:8000/api/v1/results/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/video -o output.mp4
```

### 4.3 Download Keyframe Preview
- **Method**: `GET /api/v1/results/{id}/frames/{frame_name}`
**Example**:
```bash
curl -X GET http://localhost:8000/api/v1/results/9b1deb4d.../frames/keyframe_0.jpg -o frame.jpg
```

### 4.4 Download PDF Report
- **Method**: `GET /api/v1/results/{id}/report.pdf`
- **Response**: `application/pdf`
**Example**:
```bash
curl -X GET http://localhost:8000/api/v1/results/9b1deb4d.../report.pdf -o report.pdf
```

### 4.5 Soft Delete Result (Move to Recycle Bin)
- **Method**: `DELETE /api/v1/results/{id}`
- **Query Parameters**: `permanent=true` (optional hard delete).
- **Response**: `204 No Content`
**Example**:
```bash
curl -X DELETE http://localhost:8000/api/v1/results/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d
```

### 4.6 Restore Result from Recycle Bin
- **Method**: `POST /api/v1/results/{id}/restore`
- **Response**: `200 OK`
```json
{
  "status": "restored",
  "job_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
}
```
**Example**:
```bash
curl -X POST http://localhost:8000/api/v1/results/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/restore
```

---

## 5. History & Insights

### 5.1 Query History
- **Method**: `GET /api/v1/history`
- **Query Parameters**:
  - `tank_id`: (Optional) Filter by tank UUID.
  - `page`: Page index (default: 1).
  - `page_size`: Items per page (default: 20).
- **Response**: `200 OK`
**Example**:
```bash
curl -X GET "http://localhost:8000/api/v1/history?page=1&page_size=10"
```

### 5.2 Get Tank Insights & FSI
- **Method**: `GET /api/v1/insights`
- **Query Parameters**: `tank_id` (optional).
- **Response**: `200 OK`
```json
{
  "tank_id": "550e8400-e29b-41d4-a716-446655440000",
  "fsi": 42.0,
  "level": "Moderate",
  "trend": "improving",
  "series": [
    {"date": "2026-11-10", "score": 68},
    {"date": "2026-11-12", "score": 42}
  ],
  "messages": [
    "Tank stress has decreased over recent sessions."
  ]
}
```
**Example**:
```bash
curl -X GET "http://localhost:8000/api/v1/insights?tank_id=550e8400-e29b-41d4-a716-446655440000"
```

---

## 6. Recycle Bin & Cleanup

### 6.1 List Recycle Bin Items
- **Method**: `GET /api/v1/trash`
- **Response**: `200 OK`
**Example**:
```bash
curl -X GET http://localhost:8000/api/v1/trash
```

### 6.2 Purge Expired Items
- **Method**: `POST /api/v1/trash/purge`
- **Response**: `200 OK`
```json
{
  "purged": 2
}
```
**Example**:
```bash
curl -X POST http://localhost:8000/api/v1/trash/purge
```

---

## 7. Notifications & Alerts

### 7.1 List Alerts
- **Method**: `GET /api/v1/alerts`
- **Query Parameters**: `unread=true` (optional).
- **Response**: `200 OK`
**Example**:
```bash
curl -X GET "http://localhost:8000/api/v1/alerts?unread=true"
```

### 7.2 Mark Alert as Read
- **Method**: `POST /api/v1/alerts/{id}/read`
- **Response**: `200 OK`
**Example**:
```bash
curl -X POST http://localhost:8000/api/v1/alerts/3c8b415e-8557-4581-9b98-175f7df43e49/read
```

---

## 8. Demo Seeding Utility

### 8.1 Seed Demo Data
- **Method**: `POST /api/v1/demo/seed`
- **Summary**: Creates "Demo Tank (sample)" and populates it with sample analyses across historical dates (idempotent).
- **Response**: `200 OK`
```json
{
  "tank_id": "83cf9c9a-9e1b-4cf7-932d-948ff1eb2c64",
  "result_ids": [
    "d6b5e12f-fbe3-4852-9b24-9b2e259b1dc9",
    "2e6fa9a8-e7be-4767-a2f1-63cb92ee9584"
  ]
}
```
**Example**:
```bash
curl -X POST http://localhost:8000/api/v1/demo/seed
```
