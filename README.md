# 📄 Food Distribution & Rescue Platform

**Food Distribution & Rescue Platform** is an enterprise-grade geospatial web application designed to connect food donors (restaurants, caterers, hotels) with nearby NGOs to eliminate food waste. It demonstrates an end-to-end logistics pipeline that transforms surplus food supply into direct community impact using geospatial filtering and deterministic matching algorithms.

## 🚀 Key Features

### 📍 Geospatial Discovery & Matching
- Uses **PostgreSQL + PostGIS** for real-time geographic filtering (`ST_DWithin`).
- NGOs only see available food within their physically reachable radius.

### 🧠 Deterministic Recommendation Engine
- Replaces unpredictable AI with a highly transparent matching algorithm.
- Evaluates matches based on **Distance (30%), Urgency (30%), Category Match (25%), and Capacity Efficiency (15%)**.
- Provides human-readable reasons for every match score.

### 🛡️ Backend-Controlled State Machine
- Strict linear lifecycle: `AVAILABLE` → `CLAIMED` → `PICKUP_ASSIGNED` → `PICKED_UP` → `COMPLETED`.
- Built with PostgreSQL transactional locks (`SELECT ... FOR UPDATE`) to guarantee atomic claiming and prevent double-booking.

### 🧪 Automated Food Safety Risk Assessment
- Deterministic risk engine evaluates prep times, usable limits, and storage conditions.
- High-risk items (e.g., past expiry) are hard-rejected at the API layer for public safety.

### 🔐 Role-Based Access Control (RBAC)
- Secure separation of concerns for `DONOR`, `NGO`, and `ADMIN` users.
- JWT-based authentication ensures zero lateral movement between roles.

## 🛠️ Tech Stack

| Category | Technology |
| --- | --- |
| **Frontend** | React 18, TypeScript, Vite, Vanilla CSS |
| **Backend Engine** | Node.js, Express.js |
| **Database** | PostgreSQL (Neon.tech) |
| **Geospatial Processing** | PostGIS |
| **Security** | JWT, bcrypt |
| **Deployment** | Vercel (Frontend), Render (Backend API) |

## 📂 Project Structure

```text
Food-Distribution/
│
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   ├── donations/
│   │   ├── profiles/
│   │   └── shared/
│   ├── migrate.ts
│   └── seed.ts
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   └── pages/
│   ├── vite.config.ts
│   └── vercel.json
│
├── README.md
└── .env.example
```

## ⚙️ Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Harshv2608/food-distribution-app.git
cd food-distribution-app
```

### 2. Database Setup (Neon / Local)
Create a new PostgreSQL database (ensure PostGIS is enabled).
Run the initialization script to build the architecture:
```bash
npx tsx backend/migrate.ts
```

### 3. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file based on `.env.example` with your `DATABASE_URL`, `JWT_SECRET`, and `JWT_ACCESS_SECRET`.
```bash
npm run dev
```

### 4. Frontend Setup
Open a new terminal:
```bash
cd frontend
npm install
```
Create a `.env` file with `VITE_API_URL=http://localhost:3000` (or your deployed backend URL).
```bash
npm run dev
```
The application will automatically open in your browser at `http://localhost:5173`.

## 🧠 How It Works

```text
Donor Posts Surplus Food
│
▼
Backend Risk Assessment (Checks expiry, storage, safety)
│
▼
PostgreSQL + PostGIS Filtering (Finds NGOs within radius)
│
▼
Matching Engine (Scores based on distance, urgency, capacity)
│
▼
NGO Claims Food (Atomic DB transaction locks the donation)
│
▼
Fulfillment Lifecycle (Pickup Assigned → Picked Up → Completed)
```

## 📈 Impact

This project demonstrates how geospatial data and strict deterministic algorithms can modernize food rescue operations by:
- Automating the discovery of nearby surplus food.
- Preventing logistical collisions via transactional database locks.
- Enforcing food safety standards at the API level.
- Creating structured, traceable pipelines from donation to delivery.
- Enabling real-time tracking of community impact.

## 🎯 Future Improvements

- Support multiple concurrent drop-offs (route optimization).
- Export historical impact data to Excel and CSV.
- Logistics visualization using interactive maps.
- Mobile app integration for on-the-go volunteer routing.
- Cloud deployment on AWS or Azure.
- Advanced Notification System (SMS and Email alerts).

## 📜 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**Harsh Vardhan**
- GitHub: [https://github.com/Harshv2608](https://github.com/Harshv2608)

⭐ **If you found this project useful, consider giving it a star!**
