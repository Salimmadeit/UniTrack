# System Architecture — Uni-Track

> Phase 2 Deliverable | Architecture & Design Document

---

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph "Driver Phone"
        D[driver.html + driver.js]
        GPS[Browser GPS API]
        WL[Wake Lock API]
    end

    subgraph "Dispatcher Phone"
        DI[dispatcher.html + queue.js]
    end

    subgraph "Student Phone"
        S[index.html + ui.js]
        LF[Leaflet Map]
    end

    subgraph "Cloud Server - Render/Railway"
        subgraph "Spring Boot Application"
            CT[Controllers]
            SV[Services]
            RP[Repositories]
        end
        DB[(H2 Database - File Mode)]
    end

    GPS -->|watchPosition| D
    WL -->|Keep screen on| D
    D -->|POST /api/v1/location every 5-10s| CT
    DI -->|POST /api/v1/queue one-tap| CT
    S -->|GET /api/v1/location poll 7s| CT
    S -->|GET /api/v1/eta?lat&lng| CT
    S -->|GET /api/v1/queue poll 7s| CT
    S -->|GET /api/v1/routes on load| CT
    CT --> SV
    SV --> RP
    RP --> DB

    style DB fill:#0B6BCB,color:#fff
    style CT fill:#1A73E8,color:#fff
    style SV fill:#1A73E8,color:#fff
    style RP fill:#1A73E8,color:#fff
```

---

## 2. MVC Architecture (Backend)

```mermaid
graph LR
    subgraph "Controller Layer"
        LC[LocationController]
        EC[EtaController]
        QC[QueueController]
        HC[HealthController]
    end

    subgraph "Service Layer"
        LS[LocationService]
        ES[EtaService]
        QS[QueueService]
    end

    subgraph "Repository Layer"
        LR2[LocationRepository]
        QR[QueueStatusRepository]
        RR[RouteRepository]
        SR[StopRepository]
    end

    subgraph "Model Layer"
        LM[Location]
        QM[QueueStatus]
        RM[Route]
        SM[Stop]
    end

    subgraph "Utility"
        HU[HaversineUtil]
    end

    LC --> LS
    EC --> ES
    QC --> QS
    LS --> LR2
    ES --> LR2
    ES --> SR
    ES --> HU
    QS --> QR

    LR2 --> LM
    QR --> QM
    RR --> RM
    SR --> SM
```

### Why MVC?
- **Spec mandate:** The execution plan explicitly requires MVC separation.
- **Testability:** Services can be unit-tested independently of HTTP.
- **Clarity:** Each layer has one responsibility — controllers validate input, services implement logic, repositories handle data.

---

## 3. Data Flow Diagrams

### Driver → Backend → Student (Location Flow)

```mermaid
sequenceDiagram
    participant Driver as Driver Phone
    participant API as Spring Boot API
    participant DB as H2 Database
    participant Student as Student Phone

    loop Every 5-10 seconds
        Driver->>Driver: GPS watchPosition fires
        Driver->>API: POST /api/v1/location {lat, lng, speed, heading}
        API->>API: Validate input
        API->>DB: Upsert location row (single row)
        API-->>Driver: 200 OK {id, lat, lng, timestamp}
    end

    loop Every 7 seconds (polling)
        Student->>API: GET /api/v1/location
        API->>DB: SELECT latest location
        DB-->>API: Location row
        API-->>Student: 200 {lat, lng, speed, heading, timestamp}
        Student->>Student: Update state machine (freshness check)
        Student->>Student: Update hero card (ETA, confidence)
        Student->>Student: Update map marker (setLatLng)
    end
```

### Dispatcher → Backend → Student (Queue Flow)

```mermaid
sequenceDiagram
    participant Disp as Dispatcher Phone
    participant API as Spring Boot API
    participant DB as H2 Database
    participant Student as Student Phone

    Disp->>Disp: Tap queue button (10s debounce)
    Disp->>API: POST /api/v1/queue {level: "PACKED"}
    API->>API: Validate level enum
    API->>DB: Upsert queue_status row
    API-->>Disp: 200 {level, updatedAt}

    Note over Student: Next poll cycle picks up new queue status
    Student->>API: GET /api/v1/queue
    API->>DB: SELECT latest queue_status
    API-->>Student: 200 {level: "PACKED", updatedAt}
    Student->>Student: Update queue badge (🔴 Packed)
    Student->>Student: Recalculate walking suggestion
```

---

## 4. Frontend Module Architecture

```mermaid
graph TD
    subgraph "Student View - index.html"
        UI[ui.js - Orchestrator]
        API[api.js - Fetch Wrappers]
        MAP[map.js - Leaflet Control]
        ETA[eta.js - Haversine + Walking]
        QUEUE[queue.js - Badge Rendering]
        CFG[config.js - Constants]
        UTL[utils.js - Helpers]
    end

    UI -->|"fetchLocation(), fetchEta(), fetchQueue()"| API
    UI -->|"updateShuttleMarker()"| MAP
    UI -->|"isWalkingFaster()"| ETA
    UI -->|"renderQueueStatus()"| QUEUE
    API -->|API_BASE_URL, timeout| CFG
    UI -->|"formatTimeAgo(), debounce()"| UTL
    ETA -->|WALKING_SPEED_KMH| CFG

    style UI fill:#0B6BCB,color:#fff
    style API fill:#1A73E8,color:#fff
    style MAP fill:#0F9D58,color:#fff
```

**`ui.js` is the orchestrator.** It owns the polling loop (`setInterval`), calls `api.js` for data, passes results to `map.js`, `eta.js`, and `queue.js` for rendering, and manages the network state machine. No other module starts its own timers or fetches.

---

## 5. Deployment Architecture

```mermaid
graph LR
    subgraph "Frontend - Netlify/Vercel"
        FE[Static HTML/CSS/JS]
    end

    subgraph "Backend - Render Free Tier"
        BE[Spring Boot JAR]
        H2[(H2 File DB)]
    end

    FE -->|HTTPS API calls| BE
    BE --> H2

    style FE fill:#0F9D58,color:#fff
    style BE fill:#1A73E8,color:#fff
    style H2 fill:#0B6BCB,color:#fff
```

### Deployment decisions:

| Aspect | Choice | Rationale |
|---|---|---|
| Frontend host | Netlify or Vercel | Free tier, automatic HTTPS, CDN for fast load on Nigerian networks |
| Backend host | Render free tier | Free, supports Java, auto-deploys from Git, HTTPS included |
| Database | H2 file mode on Render | Render's free tier includes ephemeral disk — H2 file persists within a deploy cycle. Data seeds on startup regardless |
| CORS | Allow frontend origin | Configured in `CorsConfig.java` |

> **Note on Render free tier:** The server spins down after 15 min of inactivity, causing a ~30s cold start on first request. This is acceptable for an MVP field test. The student UI's state machine will show "Updating..." during the cold start, then transition to NORMAL once the first response arrives.

---

## 6. Technology Stack Summary

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Language | Java | 25 (LTS) | Backend logic |
| Framework | Spring Boot | 3.x (latest) | REST API, DI, data layer |
| Database | H2 | Embedded | Lightweight, zero-config |
| ORM | Spring Data JPA | Via Spring Boot | Repository pattern |
| Validation | Jakarta Validation | Via Spring Boot | `@Valid` input checking |
| Build tool | Maven | 3.9+ | Dependency management, JAR packaging |
| Frontend | HTML5 + CSS3 + JS | ES6+ | No framework, vanilla |
| CSS framework | Bootstrap 5 | 5.3.x CDN | Responsive grid, components |
| Map | Leaflet.js | 1.9.x CDN | Interactive map (swappable to Google Maps later) |
| Tiles | OpenStreetMap | — | Free, no API key needed |
