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
  "latitude": 6.5190,
  "longitude": 3.3905,
  "speed": 22.5,
  "heading": 180.0,
  "updatedAt": "2026-08-09T13:30:05.412Z",
  "serverTime": "2026-08-09T13:30:07.918Z",
  "ageSeconds": 2
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
  "latitude": 6.5190,
  "longitude": 3.3905,
  "speed": 22.5,
  "heading": 180.0,
  "updatedAt": "2026-08-09T13:30:05.412Z",
  "serverTime": "2026-08-09T13:30:07.918Z",
  "ageSeconds": 2
}
```

| Field | Type | Notes |
|---|---|---|
| `updatedAt` | ISO-8601 instant | Always UTC with a trailing `Z`. |
| `serverTime` | ISO-8601 instant | The server's clock when the response was built. Lets a client detect its own skew. |
| `ageSeconds` | integer | How old the reading is, **measured on the server**. Clients should use this. |

> **Why `ageSeconds` exists, and why clients must prefer it.**
> The network state machine keys entirely off how old a reading is. Deriving that
> on the client means subtracting a server timestamp from a client clock, and the
> two disagree in practice. This originally shipped as a `LocalDateTime`
> serialised without an offset (`2026-08-09T14:30:05`); the container runs in UTC,
> phones on campus run at UTC+1, and a browser parses an offset-less datetime as
> *local* time — so a reading one second old measured as one hour old and the
> student view showed "offline" while the shuttle marker was visibly moving.
> Two changes make that unreachable: the timestamp is now an absolute instant, and
> the age is computed server-side where both clocks are the same clock. A wrong
> clock on the student's own device no longer breaks the state machine either.
>
> The `id` field is deliberately no longer returned: it was a database detail, not
> part of the contract.

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

**Purpose:** Report the current crowd level at the stop. Both **dispatchers** and
**students** may report — students are standing at the stop and can see the queue,
which often makes them the more current source.

**Request body:**
```json
{
  "level": "MODERATE",
  "source": "STUDENT"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `level` | string | ✅ | Must be one of: `LOW`, `MODERATE`, `PACKED` (case-insensitive) |
| `source` | string | ❌ | `STUDENT` or `DISPATCHER` (case-insensitive). Defaults to `DISPATCHER` |

**Response `200 OK`:**
```json
{
  "level": "MODERATE",
  "source": "STUDENT",
  "updatedAt": "2026-08-09T13:32:10.204Z",
  "serverTime": "2026-08-09T13:32:10.221Z",
  "ageSeconds": 0
}
```

**Response `400 Bad Request`:**
```json
{
  "error": "Validation failed",
  "details": ["level must be one of: LOW, MODERATE, PACKED"]
}
```

**Response `429 Too Many Requests`** (debounced):
```json
{
  "level": "MODERATE",
  "source": "STUDENT",
  "updatedAt": "2026-08-09T13:32:10.204Z",
  "serverTime": "2026-08-09T13:32:13.900Z",
  "ageSeconds": 3
}
```
Accompanied by a `Retry-After` header, in seconds.

> **Debounce semantics.** The spec's 10-second anti-spam rule is enforced here as
> well as in the browser, because this endpoint is public and unauthenticated — a
> guard that lives in the page can simply be bypassed.
>
> The window is keyed on **(level, source)**, not applied globally. A flat "one
> report per 10 seconds" lock sounds stricter but behaves badly: the queue is a
> single shared row and there is no per-user identity to rate-limit against, so
> ten students each tapping once would have nine honest reports silently dropped.
> What needs suppressing is an accidental double-tap — a repeat of the same value.
> A genuine change of state ("it was Moderate, now it's Packed") is exactly the
> report that must get through, so it is never debounced.
>
> `429` rather than `400`: the payload was valid, the caller was merely early. The
> body still carries the live queue state, so a rejected client does not need a
> second request to refresh its display.

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
  "source": "STUDENT",
  "updatedAt": "2026-08-09T13:32:10.204Z",
  "serverTime": "2026-08-09T13:32:14.010Z",
  "ageSeconds": 4
}
```

`source` tells the UI where the number came from; `ageSeconds` matters because a
"Packed" reading from forty minutes ago should not be presented as the current
state of the stop. See the note under `GET /location` for why the age is computed
server-side.

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
    "description": "Campus transit corridor from Main Gate Terminal to Faculty of Science via University Road",
    "stops": [
      { "id": 1, "name": "Main Gate", "latitude": 6.5178, "longitude": 3.3854, "orderIndex": 1 },
      { "id": 2, "name": "Sports Centre", "latitude": 6.5165, "longitude": 3.3935, "orderIndex": 2 },
      { "id": 3, "name": "Faculty of Science", "latitude": 6.5172, "longitude": 3.3985, "orderIndex": 3 }
    ]
  },
  {
    "id": 2,
    "name": "Main Gate → DLI",
    "description": "Residential corridor from Main Gate to Distance Learning Institute via New Hall",
    "stops": [
      { "id": 4, "name": "Main Gate", "latitude": 6.5178, "longitude": 3.3854, "orderIndex": 1 },
      { "id": 5, "name": "New Hall", "latitude": 6.5200, "longitude": 3.3926, "orderIndex": 2 },
      { "id": 6, "name": "DLI", "latitude": 6.5119, "longitude": 3.3921, "orderIndex": 3 }
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
