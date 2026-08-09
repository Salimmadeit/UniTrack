# REST API Documentation — Uni-Track

> Phase 2 Deliverable | Endpoint Specifications

---

## Base URL

```
Production:  https://<app-name>.onrender.com/api/v1
Development: http://localhost:8080/api/v1
```

All responses return `Content-Type: application/json`.
All timestamps are in ISO 8601 format (`2026-08-09T14:30:00`).

---

## Endpoints

### 1. Health Check

```
GET /api/v1/health
```

**Purpose:** Verify the backend is running. Used by the frontend to detect backend availability.

**Response `200 OK`:**
```json
{
  "status": "UP",
  "timestamp": "2026-08-09T14:30:00"
}
```

---

### 2. Post Driver Location

```
POST /api/v1/location
```

**Purpose:** Driver broadcasts their current GPS position. Upserts the singleton location row.

**Request body:**
```json
{
  "latitude": 6.5190,
  "longitude": 3.3905,
  "speed": 22.5,
  "heading": 180.0
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `latitude` | double | ✅ | -90.0 to 90.0 |
| `longitude` | double | ✅ | -180.0 to 180.0 |
| `speed` | double | ❌ | ≥ 0.0 (km/h). Defaults to 0.0 |
| `heading` | double | ❌ | 0.0 to 360.0 (degrees). Defaults to 0.0 |

**Response `200 OK`:**
```json
{
  "id": 1,
  "latitude": 6.5190,
  "longitude": 3.3905,
  "speed": 22.5,
  "heading": 180.0,
  "updatedAt": "2026-08-09T14:30:05"
}
```

**Response `400 Bad Request`:**
```json
{
  "error": "Validation failed",
  "details": ["latitude must be between -90 and 90"]
}
```

---

### 3. Get Latest Location

```
GET /api/v1/location
```

**Purpose:** Students poll this endpoint to get the shuttle's current position.

**Response `200 OK`:**
```json
{
  "id": 1,
  "latitude": 6.5190,
  "longitude": 3.3905,
  "speed": 22.5,
  "heading": 180.0,
  "updatedAt": "2026-08-09T14:30:05"
}
```

**Response `404 Not Found`** (no location data yet):
```json
{
  "error": "No location data available",
  "details": ["Driver has not started broadcasting"]
}
```

---

### 4. Get ETA

```
GET /api/v1/eta?lat={latitude}&lng={longitude}
```

**Purpose:** Calculate ETA from shuttle's current position to the student's position, plus walking comparison.

**Query parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `lat` | double | ✅ | Student's latitude |
| `lng` | double | ✅ | Student's longitude |

**Response `200 OK`:**
```json
{
  "etaMinutes": 3.2,
  "distanceKm": 0.82,
  "shuttleSpeed": 22.5,
  "confidence": "NORMAL",
  "walkingMinutes": 9.8,
  "walkingFaster": false,
  "queueWaitMinutes": 2,
  "nearestStop": "Senate Building"
}
```

| Field | Type | Description |
|---|---|---|
| `etaMinutes` | double | Estimated shuttle arrival time in minutes |
| `distanceKm` | double | Haversine distance between shuttle and student |
| `shuttleSpeed` | double | Current shuttle speed in km/h |
| `confidence` | string | `NORMAL`, `WARNING`, `STALE`, or `DISCONNECTED` — based on data freshness |
| `walkingMinutes` | double | Walking time at 5 km/h from student to nearest stop |
| `walkingFaster` | boolean | `true` if `(etaMinutes + queueWaitMinutes) > walkingMinutes` |
| `queueWaitMinutes` | int | Estimated wait from queue level (Low=2, Moderate=8, Packed=15) |
| `nearestStop` | string | Name of the nearest stop to the student |

**Response `404 Not Found`** (no driver location):
```json
{
  "error": "Cannot calculate ETA",
  "details": ["No driver location available"]
}
```

---

### 5. Post Queue Status

```
POST /api/v1/queue
```

**Purpose:** Dispatcher sets the current queue crowd level.

**Request body:**
```json
{
  "level": "MODERATE"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `level` | string | ✅ | Must be one of: `LOW`, `MODERATE`, `PACKED` (case-insensitive) |

**Response `200 OK`:**
```json
{
  "level": "MODERATE",
  "updatedAt": "2026-08-09T14:32:10"
}
```

**Response `400 Bad Request`:**
```json
{
  "error": "Validation failed",
  "details": ["level must be one of: LOW, MODERATE, PACKED"]
}
```

---

### 6. Get Queue Status

```
GET /api/v1/queue
```

**Purpose:** Students poll this to display the current queue level.

**Response `200 OK`:**
```json
{
  "level": "MODERATE",
  "updatedAt": "2026-08-09T14:32:10"
}
```

---

### 7. Get Routes

```
GET /api/v1/routes
```

**Purpose:** Fetch all routes with their ordered stops. Called once on page load to draw polylines and stop markers.

**Response `200 OK`:**
```json
[
  {
    "id": 1,
    "name": "Main Gate → Faculty of Science",
    "description": "Shuttle route from the main entrance to the Faculty of Science complex",
    "stops": [
      { "id": 1, "name": "Main Gate", "latitude": 6.5167, "longitude": 3.3850, "orderIndex": 1 },
      { "id": 2, "name": "Sports Centre", "latitude": 6.5175, "longitude": 3.3870, "orderIndex": 2 },
      { "id": 3, "name": "Senate Building", "latitude": 6.5185, "longitude": 3.3895, "orderIndex": 3 },
      { "id": 4, "name": "Main Library", "latitude": 6.5195, "longitude": 3.3910, "orderIndex": 4 },
      { "id": 5, "name": "Faculty of Science", "latitude": 6.5210, "longitude": 3.3930, "orderIndex": 5 }
    ]
  },
  {
    "id": 2,
    "name": "Main Gate → DLI",
    "description": "Shuttle route from the main entrance to the Distance Learning Institute",
    "stops": [
      { "id": 6, "name": "Main Gate", "latitude": 6.5167, "longitude": 3.3850, "orderIndex": 1 },
      { "id": 7, "name": "Chapel Junction", "latitude": 6.5180, "longitude": 3.3865, "orderIndex": 2 },
      { "id": 8, "name": "Moremi Hall", "latitude": 6.5200, "longitude": 3.3880, "orderIndex": 3 },
      { "id": 9, "name": "DLI Road Junction", "latitude": 6.5215, "longitude": 3.3900, "orderIndex": 4 },
      { "id": 10, "name": "DLI", "latitude": 6.5230, "longitude": 3.3920, "orderIndex": 5 }
    ]
  }
]
```

---

## Error Response Format

All error responses follow a consistent shape:

```json
{
  "error": "Human-readable error title",
  "details": ["Specific error message 1", "Specific error message 2"]
}
```

| HTTP Status | When Used |
|---|---|
| `200 OK` | Successful GET or successful upsert (POST) |
| `400 Bad Request` | Invalid input (missing fields, out-of-range values) |
| `404 Not Found` | Requested resource doesn't exist (no driver location yet) |
| `500 Internal Server Error` | Unexpected server error (caught by `@ControllerAdvice`) |

---

## CORS Configuration

For MVP, the backend allows requests from all origins:

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("*")
                .allowedMethods("GET", "POST", "OPTIONS")
                .allowedHeaders("*");
    }
}
```

**Production hardening (Phase 9):** Replace `"*"` with the specific Netlify/Vercel domain.
