Here is the **10-Phase Execution Plan** for **Uni-Track**.

This breakdown isolates every component of the prompt into self-contained, sequential phases. You can paste this directly into your project repository (as `docs/PHASE_EXECUTION_PLAN.md`) or feed it to your AI agent one phase at a time to prevent token waste and control execution.

---

# 🚀 Uni-Track: 10-Phase SDLC Master Implementation Roadmap

## Overview & Rules for the AI Agent

* **Strict Phase Progression:** The AI agent must complete all tasks in the active phase, present the output, and explicitly **WAIT for user approval** before writing code for the next phase.
* **Decision Framework:** For every architectural choice, explain: **WHY**, **Alternatives Considered**, and **Trade-offs**.
* **Design System Constraints:**
* **Primary:** UNILAG Maroon (`#7B0000`)
* **Secondary:** Gold (`#FFB800`)
* **Interactive/Status:** Blue (`#1A73E8`), Green (`#0F9D58`), Orange (`#F4B400`), Red (`#DB4437`), Grey (`#9AA0A6`)
* **Typography:** System-native sans-serif (`system-ui`, `Roboto`, `Apple System`). No custom external fonts.

---

## Phase 1: Product Analysis, Scope Validation & Risk Assessment

### Objectives

Analyze product requirements, audit technical constraints, define mathematical formulas, and establish a project risk matrix.

### Key Deliverables & Tasks

1. **Product Philosophy Alignment:** Confirm "Answer-First, Map-Second" UI layout and verify strict MVP constraints (1–2 routes, 1 broadcasting driver, 5–10s HTTP polling, no WebSockets, no auth).
2. **Mathematical Specs & Algorithms:**

* **Haversine Distance Formula:** Formulate the exact mathematical equation to compute geographical distance between coordinates $(\text{lat}_1, \text{lon}_1)$ and $(\text{lat}_2, \text{lon}_2)$.
* **ETA Calculation:** $\text{ETA} = \frac{\text{Haversine Distance}}{\text{Shuttle Speed}}$.
* **Walking Algorithm Logic:** Calculate walking time assuming a constant speed of $5\text{ km/h}$. Define the condition:

$$\text{Display "Walking is Faster"} \iff (\text{Shuttle ETA} + \text{Queue Wait Time}) > \text{Walking Time}$$

1. **Risk & Edge-Case Assessment:** Identify failure modes (GPS denial, network timeout, driver offline, high queue volume, background battery drain) and document mitigation strategies.

### Handshake Checkpoint

> *AI must summarize the mathematical formulas, present the risk assessment table, explain architectural trade-offs, and **WAIT** for approval before moving to Phase 2.*

---

## Phase 2: System Architecture, Database Schema & API Specifications

### Objectives

Define the complete software blueprint, file directory structure, database schema, and REST API endpoints.

### Key Deliverables & Tasks

1. **Directory Structure Setup:**

```text
Uni-Track/
├── backend/                # Spring Boot Maven/Gradle Project
│   └── src/main/java/com/unitrack/
│       ├── controller/
│       ├── service/
│       ├── repository/
│       ├── model/
│       ├── dto/
│       ├── config/
│       └── util/
├── frontend/               # Modular Static Frontend
│   ├── index.html          # Student View
│   ├── driver.html         # Driver View
│   ├── dispatcher.html     # Dispatcher View
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── config.js
│       ├── api.js
│       ├── ui.js
│       ├── map.js
│       ├── eta.js
│       ├── queue.js
│       ├── driver.js
│       └── utils.js
└── docs/                   # System Documentation

```

1. **H2 Relational Database Schema:** Design SQL tables for `Location`, `QueueStatus`, `Route`, and `Stop` with primary keys, foreign keys, and indexes.
2. **REST API Specification:** Document request/response JSON contracts for:

* `GET /api/v1/health`
* `POST /api/v1/location` & `GET /api/v1/location`
* `GET /api/v1/eta`
* `POST /api/v1/queue` & `GET /api/v1/queue`

1. **Data Flow Diagrams:** Map data movement between Driver (GPS) $\rightarrow$ Backend $\rightarrow$ H2 DB $\rightarrow$ Student/Dispatcher Clients.

### Handshake Checkpoint

> *AI must present the complete folder tree, SQL DDL scripts, and OpenAPI/JSON endpoint payload contracts, then **WAIT** for approval.*

---

## Phase 3: Backend Core Development (Spring Boot REST API)

### Objectives

Build a production-ready, highly maintainable Spring Boot application implementing MVC architecture with an embedded H2 database.

### Key Deliverables & Tasks

1. **Spring Boot Project Setup:** Initialize project with dependencies: `Spring Web`, `Spring Data JPA`, `H2 Database`, and `Lombok` (optional/standard).
2. **Data Layer (Models & Repositories):**

* Create entities (`Location`, `QueueStatus`, `Route`, `Stop`).
* Create Spring Data JPA repositories with custom query methods (e.g., `findLatestLocation()`).

1. **Service Layer:**

* Implement `EtaService` with Java-native Haversine distance calculations.
* Implement `QueueService` to manage current crowd state.
* Implement `LocationService` to update and fetch driver coordinates.

1. **Controller Layer & DTOs:**

* Implement REST endpoints with full input validation, standard HTTP status codes (`200 OK`, `201 Created`, `400 Bad Request`, `500 Server Error`), and global exception handling (`@ControllerAdvice`).

1. **CORS Configuration:** Configure cross-origin resource sharing to allow local frontend access.

### Handshake Checkpoint

> *AI must output the fully functional Java code, verify endpoints using mock data/curl commands, explain architectural decisions, and **WAIT** for approval.*

---

## Phase 4: Frontend Base & Student "Answer-First" View

### Objectives

Construct the mobile-first student interface optimized for outdoor visibility, high contrast, and single-thumb operation (360px–414px viewports).

### Key Deliverables & Tasks

1. **HTML & CSS Foundations (`index.html`, `style.css`):**

* Implement UI design system (UNILAG Maroon `#7B0000`, Gold `#FFB800`, high-contrast typography).
* Enforce layout balance: Top 30% reserved for **Hero Answer Card**, Bottom 70% for **Leaflet Map**.

1. **Hero Answer Card UI:**

* Render fields: *Nearest Shuttle*, *ETA*, *Confidence*, *Queue Status*, *Walking Suggestion*, and *Freshness Timestamp*.

1. **Leaflet.js & OpenStreetMap Integration (`map.js`):**

* Center map on UNILAG campus coordinates.
* Render polyline route overlay and bus stop markers.
* Implement marker re-use (`marker.setPosition()`) to prevent DOM thrashing on coordinate updates.

1. **Offline / No Shuttle State:** Render graceful UI banner (*"No active shuttle right now..."*) when driver data is inactive.

### Handshake Checkpoint

> *AI must provide frontend code files, confirm mobile viewport compatibility (360px/390px/414px), demonstrate marker reuse logic, and **WAIT** for approval.*

---

## Phase 5: Driver Interface (GPS Broadcasting & Wake Lock)

### Objectives

Build the driver interface (`driver.html`) to capture real-time GPS coordinates and maintain continuous browser execution.

### Key Deliverables & Tasks

1. **Driver Interface Layout:**

* High-contrast, single-action button: **"Start Broadcasting"** / **"Stop Broadcasting"**.
* Status indicators: GPS signal quality, active transmission counter, battery-saving alerts.

1. **HTML5 Geolocation Integration (`driver.js`):**

* Request high-accuracy position (`navigator.geolocation.watchPosition` or interval `getCurrentPosition`).
* Transmit coordinates to `POST /api/v1/location` every 5–10 seconds.

1. **Screen Wake Lock API:** Prevent mobile screen lock/sleep while broadcasting is active.
2. **Error & Permission Handling:** Show explicit UI messaging if GPS permission is denied (*"Location Access Required. Please enable GPS."*).

### Handshake Checkpoint

> *AI must output `driver.html` and `driver.js`, demonstrate error fallbacks and Wake Lock integration, and **WAIT** for approval.*

---

## Phase 6: Dispatcher Interface (Queue Management)

### Objectives

Build a zero-friction queue management dashboard (`dispatcher.html`) for transport administrators at campus stops.

### Key Deliverables & Tasks

1. **Dispatcher Interface Layout:**

* Three giant, one-tap status buttons:
* 🟢 **Low** (0–5 people)
* 🟠 **Moderate** (15–30 people)
* 🔴 **Packed** (50+ people)

* Eliminate all text inputs and typing fields for maximum speed outdoors.

1. **Anti-Spam Debounce Mechanism (`queue.js`):**

* Implement a strict 10-second client-side debounce to prevent accidental double-taps or rapid button spamming.

1. **API Integration:** Transmit selected queue state to `POST /api/v1/queue` and reflect real-time update confirmation on screen.

### Handshake Checkpoint

> *AI must present `dispatcher.html` and `queue.js`, prove the 10-second debounce logic works, and **WAIT** for approval.*

---

## Phase 7: End-to-End System Integration & State Machine

### Objectives

Connect all modular JS layers with the Spring Boot backend, establishing real-time HTTP polling and the automated Network State Machine.

### Key Deliverables & Tasks

1. **Modular Client Architecture:** Wire up `api.js`, `ui.js`, `eta.js`, `map.js`, and `utils.js` into a unified execution flow.
2. **Network State Machine Implementation:**

* **NORMAL (0–15s since update):** Display Green ETA status badge.
* **WARNING (16–30s since update):** Display Grey ETA status badge with *"Updating..."* label.
* **STALE (31–60s since update):** Display warning overlay with last update timestamp (e.g., *"Last updated 45 sec ago"*).
* **DISCONNECTED (60s+ without data):** Fade map shuttle marker to 50% opacity and display *"Location Unavailable"* notification.

1. **Polling Engine:** Establish clean `setInterval` execution (5–10s) with request cancellation to prevent trailing memory leaks.

### Handshake Checkpoint

> *AI must provide integration code, demonstrate state machine transition thresholds, verify error overlays, and **WAIT** for approval.*

---

## Phase 8: Quality Assurance & Edge-Case Testing

### Objectives

Validate the end-to-end MVP under real-world UNILAG network and operational conditions.

### Key Deliverables & Tasks

1. **Execution Testing Matrix:**

* **Network Drop:** Simulate client loss of cell coverage during polling.
* **GPS Denial:** Test graceful recovery when location permission is blocked.
* **Queue Debounce:** Verify backend protection against concurrent rapid clicks.
* **Backend Offline:** Ensure client displays network reconnection banners without crashing the DOM.

1. **Accessibility & Outdoor Visibility Audit:**

* Verify ARIA labels, high contrast ratios, and keyboard accessibility.
* Verify single-thumb touch target sizes ($\ge 48\text{px}$).

1. **Performance Optimization:** Confirm lazy rendering, minimal DOM manipulation, and zero redundant map marker instantiation.

### Handshake Checkpoint

> *AI must present a completed QA test log covering all edge cases, detail performance benchmarks, and **WAIT** for approval.*

---

## Phase 9: Deployment Strategy & Build Configuration

### Objectives

Prepare executable production artifacts for both local Spring Boot runtime and static frontend web hosting.

### Key Deliverables & Tasks

1. **Backend Packaging:**

* Configure Maven/Gradle to assemble a self-contained, executable Fat-JAR (`mvn clean package`).
* Configure `application-prod.properties` for production database/server settings.

1. **Frontend Asset Distribution:**

* Configure static asset directory serving via Spring Boot (`/src/main/resources/static`) or prepare standalone deployment for hosting platforms like Netlify/Vercel.

1. **Environment & CORS Hardening:** Lock down production endpoints and remove debug logging flags from client scripts.

### Handshake Checkpoint

> *AI must detail build commands, verify zero console errors, provide deployment configuration files, and **WAIT** for approval.*

---

## Phase 10: Technical Documentation & Final System Handoff

### Objectives

Produce final technical documentation, API guides, system diagrams, and future extension roadmaps.

### Key Deliverables & Tasks

1. **Master README.md:** Write complete installation, setup, execution, and folder structure documentation.
2. **API & Database Documentation (`docs/API_DOCS.md`):** Complete request/response documentation and database entity-relationship diagrams.
3. **Testing & Deployment Manuals:** Step-by-step guides for running automated/manual tests and deploying the production JAR.
4. **SDG & Future Roadmap Documentation:**

* Document alignment with **SDG 9** (Industry/Innovation), **SDG 11** (Sustainable Cities), and **SDG 13** (Climate Action) [source: 4].
* Detail Phase 2 features: multi-route expansion, driver authentication, analytics dashboard, and predictive machine learning ETAs.

### Handshake Checkpoint

> *AI must output complete markdown documentation files and present the final project completion summary.*
