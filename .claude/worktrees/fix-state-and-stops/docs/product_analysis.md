# Phase 1: Product Analysis, Scope Validation & Risk Assessment

> **Uni-Track** — Campus Shuttle Tracking MVP for University of Lagos
> Phase 1 Deliverable | Analysis Only — No Code

---

## 1. Product Philosophy Alignment

### "Answer-First, Map-Second" — Confirmed ✅

The spec's core philosophy is that students don't open this app to browse a map — they open it for **answers**:

| Question | How the UI Answers It |
|---|---|
| Where is the shuttle? | Nearest shuttle name + stop in the Hero Card |
| When will it arrive? | ETA in minutes, prominently displayed |
| Can I trust this ETA? | Confidence badge driven by the Network State Machine |
| Is it worth waiting? | Queue status (Low / Moderate / Packed) |
| Is walking faster? | Walking comparison shown only when walking wins |

**Layout contract:** Top 30% of the viewport is the Hero Answer Card. Bottom 70% is the Leaflet map. The map is supplementary — the card alone should be sufficient for 80% of use cases.

### MVP Constraints — Validated ✅

| Constraint | Status | Notes |
|---|---|---|
| 1–2 routes | ✅ Accepted | Default: 1 route (Main Gate → Faculty of Science → Senate → Engineering → Second Gate) |
| 1 broadcasting driver | ✅ Accepted | Single-row upsert model in the database |
| No authentication | ✅ Accepted | Risk acknowledged — anyone can POST locations (see Risk #6) |
| No payment | ✅ Accepted | Out of scope |
| No AI / ML | ✅ Accepted | ETA is purely distance / speed |
| No WebSockets | ✅ Accepted | HTTP polling at 5–10 second intervals |
| No push notifications | ✅ Accepted | Browser-only |
| H2 embedded database | ✅ Accepted | File-based mode for persistence across restarts |

---

## 2. Mathematical Specifications

### 2.1 Haversine Distance Formula

The Haversine formula computes the great-circle distance between two points on a sphere (Earth) given their latitude and longitude.

Given two coordinates:
- Point A: $(φ_1, λ_1)$ — Student's position (or reference stop)
- Point B: $(φ_2, λ_2)$ — Shuttle's current position

**Step 1 — Convert to radians:**

$$φ_1^{rad} = φ_1 \times \frac{π}{180}, \quad λ_1^{rad} = λ_1 \times \frac{π}{180}$$

$$φ_2^{rad} = φ_2 \times \frac{π}{180}, \quad λ_2^{rad} = λ_2 \times \frac{π}{180}$$

**Step 2 — Compute deltas:**

$$Δφ = φ_2^{rad} - φ_1^{rad}, \quad Δλ = λ_2^{rad} - λ_1^{rad}$$

**Step 3 — Haversine formula:**

$$a = \sin^2\left(\frac{Δφ}{2}\right) + \cos(φ_1^{rad}) \cdot \cos(φ_2^{rad}) \cdot \sin^2\left(\frac{Δλ}{2}\right)$$

$$c = 2 \cdot \text{atan2}\left(\sqrt{a},\ \sqrt{1 - a}\right)$$

**Step 4 — Distance:**

$$d = R \times c$$

Where $R = 6{,}371$ km (Earth's mean radius).

**Implementation note:** This will be implemented as a static utility method in both:
- **Java** (`HaversineUtil.java`) — used by `EtaService` for server-side ETA
- **JavaScript** (`eta.js`) — used client-side for instant walking time calculation

**Accuracy:** At UNILAG campus scale (~2 km), the Haversine formula is accurate to within a few metres. A flat-Earth approximation would also work at this scale, but Haversine is the standard and costs negligible computation.

---

### 2.2 ETA Calculation

$$\text{ETA (minutes)} = \frac{d}{v} \times 60$$

Where:
- $d$ = Haversine distance in km between the shuttle and the student's nearest stop
- $v$ = Shuttle's current speed in km/h (from the driver's GPS data)

**Edge cases:**
| Condition | Handling |
|---|---|
| Speed = 0 (shuttle stationary) | Display "Shuttle is stopped" instead of an infinite ETA |
| Speed < 2 km/h | Treat as stopped — shuttle likely at a stop or in traffic |
| No speed data | Fall back to average shuttle speed of 20 km/h |
| Distance < 50m | Display "Arriving now" |

**Why not hardcode ETA?** The spec explicitly prohibits it. ETA must be dynamically computed from real GPS data every poll cycle. This ensures accuracy degrades gracefully (via the state machine) rather than silently becoming wrong.

---

### 2.3 Walking Algorithm

**Walking speed constant:** $v_w = 5$ km/h (average human walking speed)

$$\text{Walking Time (minutes)} = \frac{d_w}{v_w} \times 60$$

Where $d_w$ is the Haversine distance between the student and their destination stop.

**Decision logic:**

$$\text{Display "Walking is faster"} \iff (\text{Shuttle ETA} + \text{Queue Wait Time}) > \text{Walking Time}$$

**Queue Wait Time estimation** (mapped from dispatcher-set levels):

| Queue Level | Estimated Wait (minutes) | Rationale |
|---|---|---|
| 🟢 Low (0–5 people) | 2 | Minimal wait, next shuttle departure |
| 🟠 Moderate (15–30 people) | 8 | ~1 shuttle cycle wait |
| 🔴 Packed (50+ people) | 15 | Multiple cycles, significant delay |

**Design decision:** We map queue levels to fixed durations rather than requiring the dispatcher to type a number. This aligns with the "one tap, no typing" dispatcher philosophy. The trade-off is reduced precision, but for an MVP this is acceptable — the walking suggestion is advisory, not a guarantee.

**Display rule:**
- If walking **is** faster → Show: `🚶 Walking is faster (X min)`
- If walking is **not** faster → Show nothing (silence = "wait for the shuttle")

---

### 2.4 Confidence Assessment (Network State Machine)

Confidence is not computed from the ETA itself — it's derived from **data freshness**. The system tracks how many seconds have elapsed since the last successful GPS update from the driver.

| State | Time Since Last Update | UI Indicator | Meaning |
|---|---|---|---|
| **NORMAL** | 0–15 s | 🟢 Green ETA | Data is fresh — trust this ETA |
| **WARNING** | 16–30 s | 🔘 Grey ETA + "Updating..." | Data is aging — ETA may be slightly off |
| **STALE** | 31–60 s | ⚠️ "Last updated X sec ago" | Data is old — ETA is unreliable |
| **DISCONNECTED** | 60+ s | 🔴 "Location unavailable" + faded marker (50%) | Driver may be offline — don't rely on this |

**Why this approach?**
- **Alternative 1:** Server-side confidence score based on GPS accuracy + speed variance → Too complex for MVP, requires ML or statistical modelling.
- **Alternative 2:** Binary online/offline → Too crude. The 4-state machine gives graduated feedback that matches human uncertainty.
- **Chosen approach:** Freshness-based state machine → Simple, automatic, directly answers "Can I trust this ETA?" without any ML.

---

## 3. Strengths of the Specification

| Strength | Why It Matters |
|---|---|
| Answer-first philosophy | Avoids the "cool map, useless app" trap. Students get value in <2 seconds |
| One-tap dispatcher | Eliminates friction for outdoor, rushed queue reporting |
| Network state machine | Proactively communicates data trustworthiness — rare in MVPs |
| Explicit MVP boundaries | Prevents scope creep (no auth, no AI, no WebSockets) |
| Mobile-first with specific breakpoints | Forces real device thinking, not desktop-shrunk design |
| Walking comparison | Genuinely useful — many campus walks are 5–15 min |

---

## 4. Weaknesses & Improvement Suggestions

| # | Weakness | Impact | Suggested Improvement |
|---|---|---|---|
| 1 | **No authentication** — anyone can POST fake driver locations | An attacker could make the shuttle appear anywhere on campus | Accept for MVP. For Phase 2: add a simple driver PIN or token. Document this as a known limitation |
| 2 | **Single driver model** — only one person can broadcast | If the wrong person opens driver.html, they overwrite real data | Add a simple "broadcasting key" or secret URL parameter in Phase 2 |
| 3 | **Queue levels are coarse** — 3 levels with gaps (6–14 and 31–49 people are undefined) | Dispatcher must mentally round to the nearest level | Acceptable for MVP. The labels (Low/Moderate/Packed) convey *intent* more than exact counts |
| 4 | **No stop selection by students** — ETA is to the "nearest" shuttle, not to the student's destination | A student at Stop A might want ETA to Stop D, not just how far the shuttle is from them | For MVP: ETA is based on student's GPS → shuttle distance. Future: let students pick a destination stop |
| 5 | **Polling creates server load** — 10 students × 7s polling = ~85 requests/minute | Manageable for MVP, but doesn't scale to 1,000 students | Accept. Future: upgrade to SSE or WebSockets |
| 6 | **H2 is not production-grade** — in-memory or file-based, single-connection | Fine for MVP. Would fail under load | Accept. Future: PostgreSQL |
| 7 | **No historical data** — each location overwrites the previous one | Can't replay routes, can't analyse patterns | Accept for MVP. Future: append-only location log table |

---

## 5. Risk Assessment Matrix

| # | Risk | Impact | Likelihood | Severity | Mitigation Strategy |
|---|---|---|---|---|---|
| 1 | **GPS denial on driver phone** | Shuttle location stops updating; students see stale data | Medium | Critical | Show explicit "Location Access Required" message. State machine auto-degrades to DISCONNECTED. Re-prompt on page revisit |
| 2 | **Network timeout / campus Wi-Fi dead zones** | Polling fails; hero card freezes | High | High | State machine transitions to WARNING → STALE → DISCONNECTED automatically. Client retries on next interval. No crash |
| 3 | **Driver phone goes offline** (battery, app closed, phone locked) | No new location data | High | High | Wake Lock API prevents screen lock. State machine handles gracefully. "No active shuttle" banner shows after 60s |
| 4 | **Battery drain on driver phone** | Driver's phone dies mid-route | High | Medium | Wake Lock + GPS polling (not continuous tracking). Advise driver to plug in. 5–10s interval is a reasonable balance |
| 5 | **Queue spam** (dispatcher rapidly taps buttons) | Backend flooded with POST requests | Medium | Medium | 10-second client-side debounce. Button visually disabled during cooldown. Could add server-side rate limiting in Phase 2 |
| 6 | **Spoofed location data** (no auth) | Malicious user sends fake coordinates | Medium | High | Accept for MVP — campus prototype with limited users. Phase 2: add driver authentication token |
| 7 | **H2 crash / data loss** | Routes and stops lost; need re-seed | Low | Medium | Use file-based H2 (`jdbc:h2:file:./data/unitrack`). Routes/stops are seeded from `DataSeeder` on startup regardless |
| 8 | **CORS misconfiguration** | Frontend can't reach backend | Medium | Medium | `CorsConfig.java` allows all origins for MVP. Test cross-origin early in Phase 3 |
| 9 | **Leaflet map tiles fail to load** | Map area is blank | Low | Low | OSM tiles are highly reliable. Show a fallback message ("Map temporarily unavailable") if tiles fail |
| 10 | **Browser doesn't support Wake Lock API** | Driver's screen may lock during broadcasting | Medium | Low | Feature-detect Wake Lock. If unsupported, show a warning: "Keep your screen on manually" |

---

## 6. Architectural Trade-offs

### Polling vs. WebSockets vs. SSE

| Approach | Pros | Cons | Decision |
|---|---|---|---|
| **HTTP Polling (chosen)** | Simplest to implement; works everywhere; spec mandates it | Higher latency (up to 10s); more HTTP requests; slightly more server load | ✅ **Selected** — spec requirement |
| WebSockets | True real-time; lower latency; fewer requests | More complex; requires WebSocket server; spec forbids it | ❌ Excluded by spec |
| Server-Sent Events (SSE) | Simpler than WS; server-push; lower latency | Unidirectional; less browser support on older devices; spec doesn't mention | ❌ Not in spec; overkill for MVP |

### H2 vs. SQLite vs. PostgreSQL

| Database | Pros | Cons | Decision |
|---|---|---|---|
| **H2 (chosen)** | Native Java/Spring Boot integration; zero config; spec mandates it | Not production-grade; single connection | ✅ **Selected** — spec requirement |
| SQLite | Lightweight; file-based; widely used | No native Spring Data JPA support; requires extra config | ❌ |
| PostgreSQL | Production-grade; scalable; multi-connection | Requires separate server; overkill for MVP | ❌ Future upgrade path |

### Client-side vs. Server-side ETA

| Approach | Pros | Cons | Decision |
|---|---|---|---|
| **Both (chosen)** | Server: authoritative ETA via API. Client: instant walking comparison without round-trip | Duplicated Haversine code | ✅ **Selected** — better UX |
| Server only | Single source of truth; no code duplication | Walking comparison requires a network round-trip on every update | ❌ Slower UX |
| Client only | Zero server dependency for ETA | Server can't serve ETA to other consumers (future: SMS, dashboard) | ❌ Less extensible |

---

## 7. Assumptions for Proceeding

Confirmed by the project owner:

| Question | Decision |
|---|---|
| Route(s) | **2 routes:** ① Main Gate → Faculty of Science, ② Main Gate → DLI (Distance Learning Institute) |
| Java version | **Java 25** (LTS, latest — Spring Boot 3.x fully supports 25) |
| Backend hosting | **Free cloud deployment** (Render or Railway — backend reachable over mobile data) |
| Queue time mapping | Low = 2 min, Moderate = 8 min, Packed = 15 min ✅ |
| SDG narratives | Will be drafted by the developer in Phase 10 |
| Map library | **Leaflet.js + OpenStreetMap** for MVP. Architecture will be designed so the map layer can be swapped to Google Maps in a future phase |

### Nigerian Context Optimisations

The following adjustments ensure the app is practical for UNILAG students on Nigerian networks and devices:

| Concern | Optimisation |
|---|---|
| **Slow/unreliable mobile data** (MTN, Glo, Airtel — 2G/3G common) | Tiny JSON payloads (<1 KB). No images in API responses. Graceful timeout handling (8s timeout, not browser default 30s). State machine degrades visually instead of hanging |
| **Data cost** (students buy small data bundles) | Polling at 7s with ~500-byte responses ≈ 250 KB/hour — negligible. No CDN-heavy assets. Bootstrap + Leaflet loaded from CDN with cache headers |
| **Lower-end Android phones** (1–2 GB RAM, older Chrome) | No heavy frameworks. Vanilla JS. Reuse DOM elements. Lazy map tile loading. No animations beyond CSS transitions |
| **Bright outdoor sun** (Lagos climate) | High-contrast colours. Transit azure (`#0B6BCB`) on white clears 5.2:1. Large, bold text. No thin/grey fonts outdoors |
| **Intermittent power** (device battery anxiety) | Wake Lock only on driver page. Student page is passive polling — minimal battery impact |
| **Campus Wi-Fi dead zones** | State machine handles gaps. App doesn't crash — it degrades and recovers automatically |

---

## 8. Phase 1 Summary

| Deliverable | Status |
|---|---|
| Philosophy alignment confirmed | ✅ |
| Mathematical formulas documented | ✅ Haversine, ETA, Walking, Confidence |
| Risk assessment table | ✅ 10 risks identified with mitigations |
| Weaknesses identified | ✅ 7 items with improvement suggestions |
| Trade-offs explained | ✅ Polling vs WS, H2 vs PG, client vs server ETA |
| Assumptions documented | ✅ Defaults for unanswered questions |

---

> **Phase 1 is complete.**
> Awaiting approval to proceed to **Phase 2: System Architecture, Database Schema & API Specifications.**
