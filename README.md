# UniTrack

UniTrack is a lightweight shuttle-tracking prototype built for campus environments. It provides a simple backend API that accepts driver broadcasts and dispatcher queue reports, and a small front-end (student/driver/dispatcher) that visualizes shuttle location, ETA, and crowd status.

This repository is a teaching/demo project created for the COS202 class. It demonstrates a minimal full-stack flow using Spring Boot (Java), H2 (embedded), and a static frontend (HTML/CSS/JS + Leaflet/OpenStreetMap).

---

## What it does
- Accepts driver location broadcasts (`POST /api/v1/location`) and stores them.
- Accepts dispatcher queue reports (`POST /api/v1/queue`) and stores crowd levels.
- Computes a simple ETA for a student location using haversine distance and seeded route/stop data (`GET /api/v1/eta?lat=&lng=`).
- Provides three front-end pages: student (`index.html`), driver (`driver.html`), and dispatcher (`dispatcher.html`).

## Quick demo / How to run locally

Requirements:
- Java 17 (JDK)
- Maven (or use bundled `mvnw`)
- Python (optional, for serving the frontend) or any static file server

1. Start the backend (from `backend` folder):

```powershell
cd backend
# set JAVA_HOME if needed, for example:
# $env:JAVA_HOME = 'C:\\Program Files\\Microsoft\\jdk-17.0.20.8-hotspot'
.\\mvnw.cmd spring-boot:run
```

The backend will listen on `http://localhost:8080` by default. Health endpoint: `GET /api/v1/health`.

2. Serve the frontend (from project root):

```powershell
cd frontend
# quick static server (Python)
python -m http.server 5500

# then open http://localhost:5500/index.html in a browser
```

Alternatively you can open the HTML files directly in the browser, but some features (fetch/XHR) behave best when served.

### Running tests
Stop any running Spring Boot process that holds the H2 file lock, then run:

```powershell
cd backend
.\\mvnw.cmd test
```

If you see an H2 file lock error, ensure no other Java process is running against the `backend/data/unitrackdb.mv.db` file.

---

## API (brief)
- `GET /api/v1/health` — returns service health
- `POST /api/v1/location` — body: `{ latitude, longitude, speed }` — driver broadcasts
- `GET /api/v1/location` — list recent locations
- `POST /api/v1/queue` — body: `{ level }` — dispatcher queue status (LOW, MODERATE, PACKED)
- `GET /api/v1/queue` — returns latest queue status
- `GET /api/v1/eta?lat={lat}&lng={lng}` — returns ETA, distance, nearest stop, queue wait, and walking suggestion

See `backend/src/main/java/com/unitrack/controller` for controllers and DTOs.

---

## Limitations (what it does not do)
- Not production-ready: no authentication, no rate-limiting, in-memory/H2 persistence not hardened.
- ETA is heuristic-based (haversine + static walking speed + seeded route data). Not suitable for mission-critical routing.
- No map tiles caching or heavy load optimizations.
- Concurrency: the H2 file may be locked if a running server/process uses it while tests run.

## Suggested improvements / Roadmap
- Add authentication/authorization (OAuth2 or API keys) for driver/dispatcher endpoints.
- Use a resilient datastore (Postgres) and connection pooling for production.
- Replace H2 file mode with server mode or migrate to an external DB for CI/test reliability.
- Add integration tests that start the backend with Testcontainers to avoid file-lock issues.
- Improve ETA using actual route geometry, scheduled timetables, or historical travel times.
- Add end-to-end CI that builds the backend and deploys the static frontend to a CDN.

## Contributing
This repository is educational. Feel free to open issues or PRs with improvements.

---

If you'd like, I can:
- Run the quick frontend verification now and report results.
- Run `mvn test` and capture failures (if any) and fix the H2 file-lock behavior by switching tests to use in-memory mode.
