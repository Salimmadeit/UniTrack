# UniTrack — Sustainable Campus Electric Shuttle Transit System

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![Java](https://img.shields.io/badge/Java-17%2B-blue.svg)]()
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4.1-green.svg)]()
[![SDG 11](https://img.shields.io/badge/UN%20SDG-11%20Sustainable%20Cities-orange.svg)]()
[![SDG 13](https://img.shields.io/badge/UN%20SDG-13%20Climate%20Action-darkgreen.svg)]()

UniTrack is a real-time electric campus shuttle tracking, queue estimation, and dynamic dispatch system designed specifically for the University of Lagos (UNILAG) Akoka campus. Built to support **UN Sustainable Development Goals 11 (Sustainable Cities and Communities)** and **13 (Climate Action)**, UniTrack reduces campus commuter wait times, eliminates carbon-heavy idling, and provides students, drivers, and dispatchers with live telemetry.

---

## Key Capabilities

### 1. 🎓 Student Experience (`index.html`)
- **Real-Time GPS Telemetry:** Live visualization of electric shuttles operating across UNILAG campus with heading and speed.
- **Dynamic ETA & Walking Tradeoff:** Haversine distance with road-network factor computation showing whether walking is faster than waiting.
- **Verified UNILAG Stops:** Seeded stops along University Road and residential corridors:
  - **Route 1:** Main Gate ⇄ Sports Centre ⇄ Faculty of Science
  - **Route 2:** Main Gate ⇄ New Hall ⇄ DLI (Distance Learning Institute)
- **High-Demand Station Alerts:** Allows students to request bus relocation when crowds spike.
- **Privacy-First Design:** Computes nearest stop and ETA client-side; student coordinates are never broadcast to the server.
- **Dark Mode Support:** Instant zero-flicker dark/light theme toggle.

### 2. 🚌 Driver Console (`driver.html`)
- **Driver Authentication:** Secure PIN-based login (PIN: `1234` or `unilag2026`) issuing session tokens.
- **Continuous Heartbeat Broadcast:** 2.5s high-frequency location ping with battery telemetry.
- **Incoming Relocation Alerts:** Live alert banner notifying drivers when a station has passenger surge.

### 3. ⚡ Dispatcher Command Center (`dispatcher.html`)
- **Stitch 3-Column Workstation:**
  - **Column 1: Station Queue Controls:** 1-click status updates (`LOW 0–15`, `MODERATE 15–30`, `PACKED 50+`) hitting `/api/v1/queue`.
  - **Column 2: Relocation Demand Alerts Feed:** Live feed polling `/api/v1/dispatch/alerts` with 1-click `⚡ Dispatch Shuttle` acknowledge action and manual recall controls.
  - **Column 3: Fleet Status & Battery Telemetry:** Real-time state of electric shuttles (BUS-01, BUS-02), charge level (%), speed, and ping telemetry.

---

## System Architecture

- **Backend:** Java 17 + Spring Boot 3.4.1 (RESTful APIs, Spring Data JPA, H2 Database)
- **Frontend:** Vanilla HTML5 / JavaScript (ES6) + Tailwind CSS (Stitch Design System) + Leaflet / OpenStreetMap
- **Telemetry Protocols:** Continuous HTTP heartbeat broadcasts & debounced queue polling

---

## Verified UNILAG Akoka Campus Stops & Coordinates

| Bus Stop | Latitude | Longitude | Key Landmarks |
| :--- | :--- | :--- | :--- |
| **Main Gate** | `6.5178` | `3.3854` | Main Campus Entrance, University Road Origin |
| **Sports Centre** | `6.5165` | `3.3935` | Indoor Sports Hall, Gymnasium, Olympic Pool |
| **Faculty of Science** | `6.5172` | `3.3985` | Science Complex, Laboratories & Lecture Theatres |
| **New Hall** | `6.5200` | `3.3926` | Student Village, 2001 Cafeteria & Transit Hub |
| **DLI** | `6.5119` | `3.3921` | Distance Learning Institute, Southern Campus Loop |

---

## Running Locally

### Requirements
- **Java 17+ (JDK)**
- **Maven** (or use included `./mvnw` / `mvnw.cmd`)
- **Python 3** (or any static HTTP server for the frontend)

### 1. Start the Backend API
```powershell
cd backend
.\mvnw.cmd spring-boot:run
```
*API will be available at `http://localhost:8080/api/v1/health`.*

### 2. Start the Frontend
From the project root:
```powershell
python -m http.server 3000 --directory frontend
```
*Open `http://localhost:3000/` in your browser.*

### 3. Run Automated Verification Tests
```powershell
# Run backend test suite (40 unit and integration tests)
cd backend
.\mvnw.cmd test

# Run end-to-end integration and DOM verification
cd ..
node verify_all_checklist.js
node test_frontend_dom.js
```

---

## Deployment Guide

### Frontend Deployment (Netlify)
The repository includes a ready-to-use [`netlify.toml`](./netlify.toml) configured with:
- **Publish Directory:** `frontend`
- **Reverse Proxy / API Rewrite:** Proxies `/api/*` requests to the Render backend, eliminating browser CORS issues and mixed-content restrictions.
- **Content Security Policy:** Allows Leaflet tiles, Google Fonts, and Tailwind CDN.

To deploy on Netlify:
1. Connect this GitHub repository in the Netlify dashboard.
2. Build command: *(leave empty)*.
3. Publish directory: `frontend`.
4. Update the proxy destination in `netlify.toml` with your deployed backend URL.

### Backend Deployment (Render)
The repository includes a declarative [`render.yaml`](./render.yaml) blueprint:
- **Environment:** Java 17
- **Root Directory:** `backend`
- **Build Command:** `chmod +x mvnw && ./mvnw clean package -DskipTests`
- **Start Command:** `java -jar target/backend-0.0.1-SNAPSHOT.jar`
- **Health Check Path:** `/api/v1/health`
- **Port:** Automatically binds to `$PORT` supplied by Render.

---

## API Reference (Summary)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Service health status |
| `GET` | `/api/v1/routes` | Active campus shuttle routes and ordered stops |
| `GET` | `/api/v1/location` | Latest electric shuttle position and freshness |
| `GET` | `/api/v1/location/all` | All active shuttles in the fleet with telemetry |
| `POST` | `/api/v1/location` | Broadcast driver GPS, speed, and battery state |
| `GET` | `/api/v1/eta?lat={lat}&lng={lng}` | Computes ETA, road distance, and walking comparison |
| `GET` | `/api/v1/queue` | Latest queue crowd status |
| `POST` | `/api/v1/queue` | Update station queue level (`LOW`, `MODERATE`, `PACKED`) |
| `GET` | `/api/v1/dispatch/alerts` | Active passenger surge and bus demand alerts |
| `POST` | `/api/v1/dispatch/request` | Submit student passenger surge call from a station |
| `POST` | `/api/v1/dispatch/acknowledge/{id}` | Acknowledge and dispatch a shuttle to high-demand stop |
| `POST` | `/api/v1/auth/driver/login` | Driver PIN authentication (PIN: `1234`) |

---

## UN Sustainable Development Goals Alignment
- **SDG 11 (Sustainable Cities and Communities):** Safe, accessible, and sustainable campus mobility connecting academic faculties with residential halls.
- **SDG 13 (Climate Action):** Facilitating transition to zero-emission electric buses, cutting vehicle emissions, and providing data-driven fleet optimization.
