# Flowcharts & State Diagrams — Uni-Track

> Phase 2 Deliverable | Visual Logic Documentation

---

## 1. Student Polling Loop

```mermaid
flowchart TD
    START([Page Load]) --> INIT[Initialise map + fetch routes]
    INIT --> DRAW[Draw polylines + stop markers]
    DRAW --> POLL_START[Start polling interval - 7 seconds]

    POLL_START --> FETCH_LOC[GET /api/v1/location]
    FETCH_LOC --> LOC_OK{Response OK?}

    LOC_OK -->|Yes| UPDATE_STATE[Update state machine with timestamp]
    LOC_OK -->|No| INCREMENT[Increment time since last update]

    UPDATE_STATE --> FETCH_ETA[GET /api/v1/eta?lat&lng]
    INCREMENT --> CHECK_STATE[Evaluate network state]

    FETCH_ETA --> ETA_OK{Response OK?}
    ETA_OK -->|Yes| UPDATE_CARD[Update Hero Answer Card]
    ETA_OK -->|No| SHOW_STALE[Show stale ETA warning]

    UPDATE_CARD --> FETCH_QUEUE[GET /api/v1/queue]
    SHOW_STALE --> FETCH_QUEUE

    FETCH_QUEUE --> QUEUE_OK{Response OK?}
    QUEUE_OK -->|Yes| UPDATE_QUEUE[Update queue badge]
    QUEUE_OK -->|No| KEEP_QUEUE[Keep last known queue]

    UPDATE_QUEUE --> UPDATE_MAP[Update map marker position]
    KEEP_QUEUE --> UPDATE_MAP

    CHECK_STATE --> UPDATE_MAP
    UPDATE_MAP --> WAIT[Wait 7 seconds]
    WAIT --> FETCH_LOC

    style START fill:#0F9D58,color:#fff
    style FETCH_LOC fill:#1A73E8,color:#fff
    style FETCH_ETA fill:#1A73E8,color:#fff
    style FETCH_QUEUE fill:#1A73E8,color:#fff
    style UPDATE_CARD fill:#0B6BCB,color:#fff
```

---

## 2. Network State Machine

```mermaid
stateDiagram-v2
    [*] --> NORMAL

    NORMAL --> WARNING : 15s without update
    WARNING --> STALE : 30s without update
    STALE --> DISCONNECTED : 60s without update

    NORMAL --> NORMAL : New data received
    WARNING --> NORMAL : New data received
    STALE --> NORMAL : New data received
    DISCONNECTED --> NORMAL : New data received

    state NORMAL {
        direction LR
        note right of NORMAL
            Green ETA badge
            Full marker opacity
            Fresh data indicator
        end note
    }

    state WARNING {
        direction LR
        note right of WARNING
            Grey ETA badge
            "Updating..." label
            Full marker opacity
        end note
    }

    state STALE {
        direction LR
        note right of STALE
            Warning overlay
            "Last updated X sec ago"
            75% marker opacity
        end note
    }

    state DISCONNECTED {
        direction LR
        note right of DISCONNECTED
            "Location unavailable"
            50% marker opacity
            Warning badge
        end note
    }
```

### State transition logic (JavaScript):

```javascript
function getNetworkState(lastUpdateTimestamp) {
    const elapsed = (Date.now() - lastUpdateTimestamp) / 1000; // seconds

    if (elapsed <= 15) return 'NORMAL';
    if (elapsed <= 30) return 'WARNING';
    if (elapsed <= 60) return 'STALE';
    return 'DISCONNECTED';
}
```

---

## 3. Driver Broadcast Flow

```mermaid
flowchart TD
    START([Driver opens driver.html]) --> TAP_START[Tap 'Start Broadcasting']

    TAP_START --> REQ_GPS[Request GPS permission]
    REQ_GPS --> GPS_OK{Permission granted?}

    GPS_OK -->|No| SHOW_ERROR[Show 'Location Access Required. Please enable GPS.']
    SHOW_ERROR --> TAP_START

    GPS_OK -->|Yes| ACQ_WAKE[Acquire Wake Lock]
    ACQ_WAKE --> WAKE_OK{Wake Lock acquired?}

    WAKE_OK -->|No| WARN_WAKE[Show warning: 'Keep screen on manually']
    WAKE_OK -->|Yes| LOCK_ON[Screen lock prevented]

    WARN_WAKE --> START_WATCH[Start GPS watchPosition]
    LOCK_ON --> START_WATCH

    START_WATCH --> GPS_FIRE[GPS position callback fires]
    GPS_FIRE --> POST_LOC[POST /api/v1/location]
    POST_LOC --> POST_OK{Response OK?}

    POST_OK -->|Yes| INCREMENT_COUNT[Increment transmission counter]
    POST_OK -->|No| SHOW_NET_ERR[Show network error indicator]

    INCREMENT_COUNT --> WAIT_GPS[Wait for next GPS event - 5-10s]
    SHOW_NET_ERR --> WAIT_GPS
    WAIT_GPS --> GPS_FIRE

    TAP_STOP[Tap 'Stop Broadcasting'] --> CLEAR_WATCH[Clear GPS watch]
    CLEAR_WATCH --> RELEASE_WAKE[Release Wake Lock]
    RELEASE_WAKE --> IDLE([Idle - Not Broadcasting])

    style START fill:#0F9D58,color:#fff
    style SHOW_ERROR fill:#DB4437,color:#fff
    style POST_LOC fill:#1A73E8,color:#fff
    style IDLE fill:#9AA0A6,color:#fff
```

---

## 4. Walking Algorithm Decision Tree

```mermaid
flowchart TD
    START([Student position known]) --> CALC_DIST[Calculate Haversine distance to destination stop]
    CALC_DIST --> CALC_WALK["Walking Time = distance / 5 km/h × 60 minutes"]

    CALC_WALK --> HAS_ETA{Shuttle ETA available?}

    HAS_ETA -->|No| NO_SHOW_1[Do not show walking suggestion]

    HAS_ETA -->|Yes| GET_QUEUE[Get current queue level]
    GET_QUEUE --> MAP_QUEUE["Map queue to wait time: LOW=2m, MODERATE=8m, PACKED=15m"]

    MAP_QUEUE --> COMPARE{"(Shuttle ETA + Queue Wait) > Walking Time?"}

    COMPARE -->|Yes| SHOW_WALK["Show: 🚶 Walking is faster (X min)"]
    COMPARE -->|No| NO_SHOW_2[Do not show walking suggestion - shuttle is faster]

    style SHOW_WALK fill:#0F9D58,color:#fff
    style NO_SHOW_1 fill:#9AA0A6,color:#fff
    style NO_SHOW_2 fill:#9AA0A6,color:#fff
    style COMPARE fill:#FFB800,color:#000
```

**Example calculation:**
- Student is 800m from their destination stop
- Walking time = 0.8 km / 5 km/h × 60 = **9.6 min**
- Shuttle ETA = 3.2 min
- Queue level = MODERATE → Queue wait = 8 min
- Total shuttle time = 3.2 + 8 = **11.2 min**
- 11.2 > 9.6 → **Walking is faster (10 min)**

---

## 5. Dispatcher Queue Update Flow

```mermaid
flowchart TD
    START([Dispatcher opens dispatcher.html]) --> SHOW_CURRENT[Show current queue status]

    SHOW_CURRENT --> WAIT_TAP[Wait for button tap]

    WAIT_TAP --> TAP_LOW["Tap 🟢 Low"]
    WAIT_TAP --> TAP_MOD["Tap 🟠 Moderate"]
    WAIT_TAP --> TAP_PACKED["Tap 🔴 Packed"]

    TAP_LOW --> CHECK_DEBOUNCE{Within 10s cooldown?}
    TAP_MOD --> CHECK_DEBOUNCE
    TAP_PACKED --> CHECK_DEBOUNCE

    CHECK_DEBOUNCE -->|Yes| IGNORE[Ignore tap - show cooldown timer]
    CHECK_DEBOUNCE -->|No| POST_QUEUE[POST /api/v1/queue]

    IGNORE --> WAIT_TAP

    POST_QUEUE --> POST_OK{Response OK?}
    POST_OK -->|Yes| UPDATE_UI[Update display + start 10s cooldown]
    POST_OK -->|No| SHOW_ERR[Show error message]

    UPDATE_UI --> WAIT_TAP
    SHOW_ERR --> WAIT_TAP

    style TAP_LOW fill:#0F9D58,color:#fff
    style TAP_MOD fill:#F4B400,color:#000
    style TAP_PACKED fill:#DB4437,color:#fff
    style IGNORE fill:#9AA0A6,color:#fff
```

---

## 6. ETA Calculation Flow (Server-side)

```mermaid
flowchart TD
    REQ([GET /api/v1/eta?lat&lng]) --> VALIDATE[Validate lat/lng parameters]
    VALIDATE --> VALID{Valid?}
    VALID -->|No| ERR_400[Return 400 Bad Request]
    VALID -->|Yes| GET_LOC[Fetch latest driver location from DB]

    GET_LOC --> LOC_EXISTS{Location exists?}
    LOC_EXISTS -->|No| ERR_404[Return 404 - No driver location]

    LOC_EXISTS -->|Yes| CALC_DIST[Haversine distance: shuttle to student]
    CALC_DIST --> CHECK_SPEED{Speed > 2 km/h?}

    CHECK_SPEED -->|No| USE_DEFAULT["Use default speed = 20 km/h"]
    CHECK_SPEED -->|Yes| USE_ACTUAL[Use actual GPS speed]

    USE_DEFAULT --> CALC_ETA["ETA = distance / speed × 60"]
    USE_ACTUAL --> CALC_ETA

    CALC_ETA --> CALC_WALK["Walking = distance / 5 × 60"]
    CALC_WALK --> GET_QUEUE[Fetch queue status]
    GET_QUEUE --> MAP_WAIT["Map level → wait minutes"]
    MAP_WAIT --> COMPARE["walkingFaster = (ETA + queueWait) > walking"]
    COMPARE --> FIND_STOP[Find nearest stop to student]
    FIND_STOP --> CALC_CONF[Calculate confidence from data freshness]
    CALC_CONF --> RESPOND[Return 200 EtaResponse JSON]

    style REQ fill:#1A73E8,color:#fff
    style RESPOND fill:#0F9D58,color:#fff
    style ERR_400 fill:#DB4437,color:#fff
    style ERR_404 fill:#DB4437,color:#fff
```
