# Matsya API Reference

The Matsya backend is powered by FastAPI and provides standard REST endpoints.
All API responses follow standard HTTP semantics and error formats.

**Base URL**: `/api/v1`
**Interactive OpenAPI Documentation**: `/api/docs`
**Raw OpenAPI Schema**: `/api/openapi.json`

---

## Standard Error Response Envelope
When an error occurs, the API returns a structured JSON payload:
```json
{
  "error": {
    "code": "resource_not_found",
    "message": "The requested resource could not be found.",
    "details": {}
  }
}
```

---

## Endpoints Overview

| Method | Path | Summary | Tags |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/alerts` | List system alerts | Alerts |
| `POST` | `/api/v1/alerts/read-all` | Mark all alerts as read | Alerts |
| `POST` | `/api/v1/alerts/{alert_id}/read` | Mark alert as read | Alerts |
| `GET` | `/api/v1/config/scoring` | Scoring and Rules Configuration | System |
| `POST` | `/api/v1/demo/seed` | Seed sample demo tank and results | Demo |
| `GET` | `/api/v1/health` | Health Check v1 | System |
| `GET` | `/api/v1/history` | Get paginated history of analyses | History |
| `GET` | `/api/v1/insights` | Get tank insights and FSI | Insights |
| `GET` | `/api/v1/jobs/{job_id}` | Get analysis job status and progress | Jobs |
| `POST` | `/api/v1/jobs/{job_id}/cancel` | Cancel a queued or running analysis job | Jobs |
| `GET` | `/api/v1/overview` | Dashboard Overview Summary | System |
| `GET` | `/api/v1/reports/{job_id}.pdf` | Download PDF report (alias) | Results |
| `GET` | `/api/v1/resources` | List curated resource library items | Resources |
| `GET` | `/api/v1/resources/{resource_id}` | Get metadata for a specific resource | Resources |
| `GET` | `/api/v1/resources/{resource_id}/file` | Download resource attachment | Resources |
| `GET` | `/api/v1/resources/{resource_id}/preview` | Inline preview or stream of resource | Resources |
| `GET` | `/api/v1/resources/{resource_id}/thumb` | Get resource thumbnail | Resources |
| `DELETE` | `/api/v1/results/{job_id}` | Delete analysis result | Results |
| `GET` | `/api/v1/results/{job_id}` | Get full analysis result | Results |
| `GET` | `/api/v1/results/{job_id}/frames/{frame_name}` | Get key frame image | Results |
| `GET` | `/api/v1/results/{job_id}/report.pdf` | Download PDF report | Results |
| `POST` | `/api/v1/results/{job_id}/restore` | Restore result from recycle bin | Results |
| `GET` | `/api/v1/results/{job_id}/video` | Stream annotated video | Results |
| `GET` | `/api/v1/settings/alerts` | Get alert settings | Alerts |
| `PUT` | `/api/v1/settings/alerts` | Update alert settings | Alerts |
| `GET` | `/api/v1/system/info` | System Information (Legacy) | System |
| `GET` | `/api/v1/system/status` | System Status | System |
| `GET` | `/api/v1/tanks` | List all tank profiles | Tanks |
| `POST` | `/api/v1/tanks` | Create a tank profile | Tanks |
| `DELETE` | `/api/v1/tanks/{tank_id}` | Delete tank and its data | Tanks |
| `GET` | `/api/v1/tanks/{tank_id}` | Get tank profile by ID | Tanks |
| `PATCH` | `/api/v1/tanks/{tank_id}` | Update tank profile | Tanks |
| `PUT` | `/api/v1/tanks/{tank_id}` | Update tank profile | Tanks |
| `GET` | `/api/v1/trash` | Get analyses in recycle bin | Trash |
| `POST` | `/api/v1/trash/purge` | Purge expired trash immediately | Trash |
| `POST` | `/api/v1/trash/{job_id}/restore` | Restore result from recycle bin (alias) | Trash |
| `POST` | `/api/v1/videos` | Upload a tank video and start analysis | Videos |
| `GET` | `/health` | Health Check | System |
