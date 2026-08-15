# Product Requirements Document

## 1. Product Vision
A free food-rescue and redistribution coordination platform connecting surplus-food donors (restaurants, caterers, events) with verified NGOs.

## 2. Core Philosophy
* **Coordination, not delivery:** We connect donors and NGOs; we do not employ drivers or manage a delivery fleet initially.
* **Keep it simple:** No AI for the sake of AI, no unnecessary microservices, no Kafka or Redis until proven necessary.
* **Easy & Safe:** The process must be frictionless for donors ("Quick Donate") and include a basic rule-based Food Risk Assessment.

## 3. Scope (MVP)
### In-Scope
* Registration and verification for Donors and NGOs.
* Donor profile defaults to enable 1-click "Quick Donate".
* Rule-based Food Risk Assessment (Low, Medium, High).
* Location-aware matching using PostGIS.
* Match scoring algorithm based on food type, distance, quantity, and time.
* Strict Donation State Machine (Created -> Available -> Claimed -> Pickup Assigned -> Picked Up -> Delivered -> Completed).
* Basic gamification (Impact Scores, Tiers, Leaderboard) based on good behavior.
* Admin dashboard for verification and monitoring.

### Out-of-Scope for MVP
* Volunteer logistics network (handled by Donor Delivery or NGO Pickup for now).
* AI Image Analysis for food safety.
* Complex microservices or distributed systems.
* Monetary rewards or payment gateways.
* Real-time continuous GPS tracking.
