# Uni-Track: Backend Integration & Implementation Guide

## Overview
This document outlines the backend requirements and necessary modifications to support the redesigned Uni-Track MVP. The goal is to transition from a basic prototype to a production-quality system that supports multi-device (Mobile/Desktop) access and robust real-time data handling.

## 1. Technical Stack (Refined)
- **Backend:** Java 17+, Spring Boot 3.x
- **Database:** H2 (Development) / PostgreSQL (Production)
- **API Style:** RESTful JSON
- **Real-time:** Short polling (5-10s) as specified in the original MVP limits.

## 2. Updated API Specification

### Location Services
- `POST /api/location`: (Driver) Update current GPS coordinates.
  - *Payload:* `{ "driverId": "BUS_A", "lat": 6.515, "lng": 3.398, "routeId": "LOOP_A", "status": "EN_ROUTE" }`
- `GET /api/location`: (Student/Dispatcher) Retrieve all active shuttle locations.
  - *Returns:* List of active bus objects with timestamps.

### Queue & Dispatch
- `GET /api/queue/{stationId}`: Get current crowd level.
- `POST /api/queue`: (Dispatcher) Update station status.
  - *Payload:* `{ "stationId": "MAIN_GATE", "level": "MODERATE", "timestamp": "ISO-8601" }`
- `POST /api/dispatch/relocate`: (Dispatcher) Request bus relocation.
  - *Payload:* `{ "busId": "BUS_A", "targetStation": "FAC_SCIENCE" }`

### ETA & Analytics
- `GET /api/eta`: Calculate arrival times based on current location and queue weight.
  - *Logic:* Distance / Speed + (Queue_Weight * Penalty_Constant).

## 3. Database Schema Changes
- **`shuttle_status` table**: Add `signal_strength` (int) and `battery_level` (int) for driver telemetry.
- **`dispatch_logs` table**: New table to track relocation requests and dispatcher performance.
- **`queue_history` table**: Store time-series data of queue levels for future predictive ETA modeling.

## 4. Backend Logic Requirements
- **Stale Data Handling**: If a driver's location hasn't updated in >60 seconds, the backend should flag the bus as 'DISCONNECTED' in the API response.
- **Walking vs. Riding Logic**: Provide a helper endpoint or include a `walking_is_faster` boolean in the ETA response based on the Haversine formula vs. current bus progress.

## 5. Security & Stability
- Implement **CORS** configuration to allow requests from both the mobile and desktop webapp origins.
- Add **Debounce Logic** on the `/api/queue` endpoint to prevent accidental spam from the dispatcher interface.
