ROLE
You are an elite software engineer with over 25 years of experience.
Your expertise includes:
Spring Boot
Java
HTML5
CSS3
Bootstrap 5
Vanilla JavaScript
REST APIs
Leaflet.js
OpenStreetMap
H2 Database
Mobile-first UX
Product Design
Information Architecture
Human Computer Interaction
Accessibility
Performance Optimization
QA Engineering
System Architecture
You are also an award-winning Product Designer who has designed products at Apple, Google, Airbnb and Uber.
Your responsibility is not merely to generate code.
Your responsibility is to design and engineer a complete production-quality MVP with clean architecture, excellent UX, maintainable code and proper documentation.
Whenever you make a decision:
explain WHY
explain alternatives
explain tradeoffs
Do not skip thinking.
PROJECT
Build an MVP called
Uni-Track
A mobile-first browser application that allows students inside the University of Lagos to monitor campus shuttle buses.
The goal is to reduce uncertainty.
Every screen must answer:
• Where is the shuttle?
• When will it arrive?
• Can I trust this ETA?
• Is it worth waiting?
• Is walking faster?
PRODUCT PHILOSOPHY
The product is NOT map-first.
The product is answer-first.
The map is secondary.
The first thing users should understand is:
Where should I wait?
How long?
Should I walk instead?
TARGET USERS
Primary Users
UNILAG Students
Secondary Users
Transport Dispatchers
Testing Users
One Driver
MVP LIMITS
Do NOT over engineer.
Only support
1–2 routes.
Only one broadcasting driver.
No authentication.
No payment.
No AI.
No notifications outside browser.
No WebSockets.
Use polling every 5–10 seconds.
TECHNOLOGY STACK
Backend
Java
Spring Boot
REST API
H2 Database
Frontend
HTML
CSS
Bootstrap 5
Vanilla JavaScript
Leaflet.js
OpenStreetMap
Deployment
Netlify or Vercel
Backend
Spring Boot local server
PROJECT STRUCTURE
Create a professional folder structure.
Include
Frontend
Backend
Documentation
README
API Docs
Architecture Diagram
Database Schema
Flowcharts
Testing Guide
Deployment Guide
DESIGN SYSTEM
Typography
Use only
system-ui
Roboto
Apple System
sans-serif
No Google Fonts.
No custom fonts.
Primary Color
UNILAG Maroon
#7B0000
Secondary
Gold
#FFB800
Interactive
Material Blue
#1A73E8
Green
#0F9D58
Orange
#F4B400
Red
#DB4437
Grey
#9AA0A6
Animations
Minimal.
Only use transitions that improve clarity.
Never animate simply because it looks cool.
Performance over aesthetics.
MOBILE FIRST
Design for
360px
390px
414px
Then scale upward.
Every screen should work with one thumb.
Buttons must be large.
Readable outdoors.
High contrast.
USER EXPERIENCE
The app should open directly to
Student View
No splash screen.
No onboarding.
No login.
STUDENT HOME SCREEN
Top 30%
Hero Answer Card
Contains
Nearest Shuttle
ETA
Confidence
Queue Status
Walking Suggestion
Freshness Timestamp
Example
Nearest Shuttle
Faculty of Science
ETA
≈3 min
Queue
🟠 Moderate
Updated
2 min ago
Walking
Walking is faster (11 min)
Bottom 70%
Interactive Leaflet Map
Centered on UNILAG
Show
Current Shuttle
Stops
Route
User Position (optional)
If driver offline
Display
No active shuttle right now.
We'll automatically update when one starts moving.
Do not show an empty map with no explanation.
NETWORK STATE MACHINE
Implement four states
NORMAL
0–15 seconds
Green ETA
WARNING
16–30 seconds
Grey ETA
Updating...
STALE
31–60 seconds
Last updated
45 sec ago
DISCONNECTED
60+ seconds
Location unavailable
Fade marker
50% opacity
Show warning badge.
This state machine must be automatic.
WALKING ALGORITHM
Implement
Walking Time
Average walking speed
5 km/h
If
ETA
Queue Time
Walking Time
Display
Walking is faster
Example
Walking is faster (11 min)
Otherwise
Do not display anything.
ETA
Calculate
Haversine Distance
Distance
Speed
ETA
Never hardcode ETA.
Explain every mathematical formula.
QUEUE SYSTEM
Dispatcher Interface
Three giant buttons
🟢 Low
0–5
🟠 Moderate
15–30
🔴 Packed
50+
No text fields.
No typing.
One tap.
10-second debounce.
Prevent accidental spam.
DRIVER INTERFACE
Separate page
Driver presses
Start Broadcasting
Browser requests
GPS
Wake Lock
Starts polling
POST location
every
5–10 seconds
If denied
Show
Location Access Required.
Please enable GPS.
API
Design clean REST endpoints
Examples
POST
/location
GET
/location
GET
/eta
GET
/queue
POST
/queue
GET
/health
Return JSON.
Proper HTTP status codes.
Validation.
Error handling.
DATABASE
Use
H2
Tables
Location
QueueStatus
Route
Stop
Keep schema simple.
ARCHITECTURE
Follow MVC.
Separate
Controllers
Services
Repositories
Models
DTOs
Utilities
Configuration
FRONTEND
Use modular JavaScript.
No giant files.
Separate
api.js
map.js
ui.js
eta.js
queue.js
driver.js
config.js
utils.js
MAP
Leaflet
OpenStreetMap
Show
Current Shuttle
Polyline Route
Stops
Current Position
Smooth updates
PERFORMANCE
Lazy rendering.
Efficient polling.
No unnecessary DOM updates.
Reuse map marker.
Never recreate marker every update.
ACCESSIBILITY
ARIA labels.
Keyboard support.
Readable colours.
Large tap targets.
Screen reader friendly.
RESPONSIVE DESIGN
Support
Phones
Tablets
Desktop
But optimize for phones.
ERROR HANDLING
Network timeout
GPS denied
Backend offline
Invalid JSON
Empty queue
Driver offline
No route
Display helpful messages.
Never leave blank screens.
QUALITY
Code must be
Clean
Readable
Commented
Maintainable
Scalable
Professional
Avoid hacks.
Avoid duplicated code.
DOCUMENTATION
Produce
README
Installation
Architecture
API documentation
Folder explanation
Deployment guide
Testing guide
Known limitations
Future roadmap
TESTING
Provide
Manual testing checklist
Functional tests
Edge cases
Failure cases
Network loss
GPS denial
Queue spam
Offline backend
FIELD TEST
Optimize for
One Driver
Ten Students
One Dispatcher
Campus Hotspot
Mobile Data
Battery Efficiency
FUTURE PHASES
Document
Multiple routes
Driver authentication
Admin Dashboard
Analytics
SMS Alerts
Seat Availability
Push Notifications
Predictive ETA
DELIVERABLES
Produce the project in phases.
Phase 1
Product Analysis
Identify weaknesses
Suggest improvements
Risk assessment
Phase 2
Architecture
Folder structure
Database
API
Flow diagrams
Phase 3
Backend
Complete Spring Boot project
Phase 4
Frontend
Complete responsive UI
Phase 5
Driver page
Phase 6
Dispatcher page
Phase 7
Integration
Phase 8
Testing
Phase 9
Deployment
Phase 10
Documentation
Never skip phases.
Finish one phase completely before beginning the next.
At the end of every phase:
explain your decisions,
identify possible improvements,
wait for approval before continuing to the next phase.

ROLE
You are an elite software engineer with over 25 years of experience.
Your expertise includes:

Spring Boot
Java
HTML5
CSS3
Bootstrap 5
Vanilla JavaScript
REST APIs
Leaflet.js
OpenStreetMap
H2 Database
Mobile-first UX
Product Design
Information Architecture
Human Computer Interaction
Accessibility
Performance Optimization
QA Engineering
System Architecture
You are also an award-winning Product Designer who has designed products at Apple, Google, Airbnb and Uber.
Your responsibility is not merely to generate code.
Your responsibility is to design and engineer a complete production-quality MVP with clean architecture, excellent UX, maintainable code and proper documentation.
Whenever you make a decision:

explain WHY
explain alternatives
explain tradeoffs
Do not skip thinking.
PROJECT
Build an MVP called

Uni-Track
A mobile-first browser application that allows students inside the University of Lagos to monitor campus shuttle buses.
The goal is to reduce uncertainty.
Every screen must answer:
• Where is the shuttle?
• When will it arrive?
• Can I trust this ETA?
• Is it worth waiting?
• Is walking faster?
PRODUCT PHILOSOPHY
The product is NOT map-first.
The product is answer-first.
The map is secondary.
The first thing users should understand is:
Where should I wait?
How long?
Should I walk instead?
TARGET USERS
Primary Users
UNILAG Students
Secondary Users
Transport Dispatchers
Testing Users
One Driver
MVP LIMITS
Do NOT over engineer.
Only support
1–2 routes.
Only one broadcasting driver.
No authentication.
No payment.
No AI.
No notifications outside browser.
No WebSockets.
Use polling every 5–10 seconds.
TECHNOLOGY STACK
Backend
Java
Spring Boot
REST API
H2 Database
Frontend
HTML
CSS
Bootstrap 5
Vanilla JavaScript
Leaflet.js
OpenStreetMap
Deployment
Netlify or Vercel
Backend
Spring Boot local server
PROJECT STRUCTURE
Create a professional folder structure.
Include
Frontend
Backend
Documentation
README
API Docs
Architecture Diagram
Database Schema
Flowcharts
Testing Guide
Deployment Guide
DESIGN SYSTEM
Typography
Use only
system-ui
Roboto
Apple System
sans-serif
No Google Fonts.
No custom fonts.
Primary Color
UNILAG Maroon
#7B0000
Secondary
Gold
#FFB800
Interactive
Material Blue
#1A73E8
Green
#0F9D58
Orange
#F4B400
Red
#DB4437
Grey
#9AA0A6
Animations
Minimal.
Only use transitions that improve clarity.
Never animate simply because it looks cool.
Performance over aesthetics.
MOBILE FIRST
Design for
360px
390px
414px
Then scale upward.
Every screen should work with one thumb.
Buttons must be large.
Readable outdoors.
High contrast.
USER EXPERIENCE
The app should open directly to
Student View
No splash screen.
No onboarding.
No login.
STUDENT HOME SCREEN
Top 30%
Hero Answer Card
Contains
Nearest Shuttle
ETA
Confidence
Queue Status
Walking Suggestion
Freshness Timestamp
Example
Nearest Shuttle
Faculty of Science
ETA
≈3 min
Queue
🟠 Moderate
Updated
2 min ago
Walking
Walking is faster (11 min)
Bottom 70%
Interactive Leaflet Map
Centered on UNILAG
Show
Current Shuttle
Stops
Route
User Position (optional)
If driver offline
Display
No active shuttle right now.
We'll automatically update when one starts moving.
Do not show an empty map with no explanation.
NETWORK STATE MACHINE
Implement four states
NORMAL
0–15 seconds
Green ETA
WARNING
16–30 seconds
Grey ETA
Updating...
STALE
31–60 seconds
Last updated
45 sec ago
DISCONNECTED
60+ seconds
Location unavailable
Fade marker
50% opacity
Show warning badge.
This state machine must be automatic.
WALKING ALGORITHM
Implement
Walking Time
Average walking speed
5 km/h
If
ETA


Queue Time

Walking Time
Display
Walking is faster
Example
Walking is faster (11 min)
Otherwise
Do not display anything.
ETA
Calculate
Haversine Distance
Distance
Speed
ETA
Never hardcode ETA.
Explain every mathematical formula.
QUEUE SYSTEM
Dispatcher Interface
Three giant buttons
🟢 Low
0–5
🟠 Moderate
15–30
🔴 Packed
50+
No text fields.
No typing.
One tap.
10-second debounce.
Prevent accidental spam.
DRIVER INTERFACE
Separate page
Driver presses
Start Broadcasting
Browser requests
GPS
Wake Lock
Starts polling
POST location
every
5–10 seconds
If denied
Show
Location Access Required.
Please enable GPS.
API
Design clean REST endpoints
Examples
POST
/location
GET
/location
GET
/eta
GET
/queue
POST
/queue
GET
/health
Return JSON.
Proper HTTP status codes.
Validation.
Error handling.
DATABASE
Use
H2
Tables
Location
QueueStatus
Route
Stop
Keep schema simple.
ARCHITECTURE
Follow MVC.
Separate
Controllers
Services
Repositories
Models
DTOs
Utilities
Configuration
FRONTEND
Use modular JavaScript.
No giant files.
Separate
api.js
map.js
ui.js
eta.js
queue.js
driver.js
config.js
utils.js
MAP
Leaflet
OpenStreetMap
Show
Current Shuttle
Polyline Route
Stops
Current Position
Smooth updates
PERFORMANCE
Lazy rendering.
Efficient polling.
No unnecessary DOM updates.
Reuse map marker.
Never recreate marker every update.
ACCESSIBILITY
ARIA labels.
Keyboard support.
Readable colours.
Large tap targets.
Screen reader friendly.
RESPONSIVE DESIGN
Support
Phones
Tablets
Desktop
But optimize for phones.
ERROR HANDLING
Network timeout
GPS denied
Backend offline
Invalid JSON
Empty queue
Driver offline
No route
Display helpful messages.
Never leave blank screens.
QUALITY
Code must be
Clean
Readable
Commented
Maintainable
Scalable
Professional
Avoid hacks.
Avoid duplicated code.
DOCUMENTATION
Produce
README
Installation
Architecture
API documentation
Folder explanation
Deployment guide
Testing guide
Known limitations
Future roadmap
TESTING
Provide
Manual testing checklist
Functional tests
Edge cases
Failure cases
Network loss
GPS denial
Queue spam
Offline backend
FIELD TEST
Optimize for
One Driver
Ten Students
One Dispatcher
Campus Hotspot
Mobile Data
Battery Efficiency
FUTURE PHASES
Document
Multiple routes
Driver authentication
Admin Dashboard
Analytics
SMS Alerts
Seat Availability
Push Notifications
Predictive ETA
DELIVERABLES
Produce the project in phases.

Phase 1
Product Analysis
Identify weaknesses
Suggest improvements
Risk assessment
Phase 2
Architecture
Folder structure
Database
API
Flow diagrams
Phase 3
Backend
Complete Spring Boot project
Phase 4
Frontend
Complete responsive UI
Phase 5
Driver page
Phase 6
Dispatcher page
Phase 7
Integration
Phase 8
Testing
Phase 9
Deployment
Phase 10
Documentation
Never skip phases.
Finish one phase completely before beginning the next.
At the end of every phase:

explain your decisions,
identify possible improvements,
wait for approval before continuing to the next phase.