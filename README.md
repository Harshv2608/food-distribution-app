# Food Rescue Platform

A full-stack, geospatial web application designed to connect food donors (restaurants, caterers) with nearby NGOs to eliminate food waste. Built with a focus on deterministic logic, data consistency, and robust architectural principles.

## 🌟 Key Features

1. **Geospatial Discovery & Matching**
   - Utilizes **PostgreSQL + PostGIS** to perform real-time geographic filtering (`ST_DWithin`).
   - NGOs only see available food within their configured pickup radius.

2. **Deterministic Recommendation Engine**
   - Replaces black-box AI with a highly explainable, transparent scoring algorithm (30/30/25/15 weighting).
   - Evaluates matches based on Distance (30%), Urgency (30%), Food Category Match (25%), and Capacity Efficiency (15%).
   - Returns human-readable reasons for every match score.

3. **Backend-Controlled State Machine**
   - Strict linear donation lifecycle: `AVAILABLE` → `CLAIMED` → `PICKUP_ASSIGNED` → `PICKED_UP` → `COMPLETED`.
   - Uses PostgreSQL transactional locks (`SELECT ... FOR UPDATE`) to guarantee atomic claiming and prevent race conditions.

4. **Food Safety Risk Assessment**
   - Deterministic risk engine evaluates prep times, usable limits, and storage conditions.
   - Food that violates safety parameters (e.g., past expiry) is hard-rejected at the API layer.

5. **Role-Based Access Control (RBAC)**
   - Secure separation of concerns for `DONOR`, `NGO`, and `ADMIN` users.
   - JWT-based authentication ensures users can only access endpoints authorized for their specific role.

## 🛠 Tech Stack

- **Frontend**: React, TypeScript, Vite, CSS Modules (Vanilla CSS)
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with PostGIS extension
- **Security**: JWT, bcrypt, environment variables

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL (with PostGIS extension installed)

### 1. Database Setup
1. Create a new PostgreSQL database (e.g., `food_rescue_db`).
2. Run the initialization script located at `backend/src/shared/schema.sql` to generate the tables, enums, and triggers.

### 2. Environment Variables
1. Rename `.env.example` to `.env` in the root directory.
2. Fill in your database credentials and generate a strong `JWT_SECRET`.
3. Set your `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

### 3. Backend Setup
```bash
cd backend
npm install
npm run dev
```

*Note: In a new environment, run `node scripts/seed_admin.js` to initialize your master admin account before logging in.*

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Visit `http://localhost:5173` in your browser.

## 📂 Project Structure
- `/backend`: Express API, grouped by feature modules (auth, profiles, donations, claims, admin, notifications).
- `/frontend`: React client, featuring context providers for Auth/Toast, protected routes, and role-specific dashboards.
- `/docs`: Initial architectural plans, product requirements, and API designs.
