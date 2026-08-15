<div align="center">
  <img src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=2070&auto=format&fit=crop" alt="Food Rescue Platform" width="100%" height="300" style="object-fit: cover; border-radius: 12px; margin-bottom: 20px;" />
  
  # 🌍 Food Distribution & Rescue Platform
  
  **A full-stack, geospatial web application designed to connect food donors (restaurants, caterers, hotels) with nearby NGOs to eliminate food waste.**
  
  [![Vercel Deployment](https://img.shields.io/badge/Deployed_on-Vercel-black?logo=vercel)](https://food-distribution-app-xi.vercel.app/)
  [![Render API](https://img.shields.io/badge/API-Render-46E3B7?logo=render)](https://food-distribution-api.onrender.com)
  [![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20Neon-336791?logo=postgresql)](https://neon.tech)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

  [**Live Demo**](https://food-distribution-app-xi.vercel.app/) • [**Report Bug**](#) • [**Request Feature**](#)
</div>

---

## 🌟 Key Features

1. 📍 **Geospatial Discovery & Matching**
   - Utilizes **PostgreSQL + PostGIS** for real-time geographic filtering (`ST_DWithin`).
   - NGOs only see available food within their physically reachable radius.

2. 🧠 **Deterministic Recommendation Engine**
   - Replaces unpredictable AI with a highly transparent matching algorithm.
   - Evaluates matches based on **Distance (30%), Urgency (30%), Category Match (25%), and Capacity Efficiency (15%)**.
   - Provides human-readable reasons for every match score.

3. 🛡️ **Backend-Controlled State Machine**
   - Strict linear lifecycle: `AVAILABLE` → `CLAIMED` → `PICKUP_ASSIGNED` → `PICKED_UP` → `COMPLETED`.
   - Built with PostgreSQL transactional locks (`SELECT ... FOR UPDATE`) to guarantee atomic claiming and prevent double-booking.

4. 🧪 **Automated Food Safety Risk Assessment**
   - Deterministic risk engine evaluates prep times, usable limits, and storage conditions.
   - High-risk items (e.g., past expiry) are hard-rejected at the API layer for public safety.

5. 🔐 **Role-Based Access Control (RBAC)**
   - Secure separation of concerns for `DONOR`, `NGO`, and `ADMIN` users.
   - JWT-based authentication ensures zero lateral movement between roles.

---

## 🏗️ Architecture & Core Workflows

The platform is designed around a strictly enforced data flow to ensure food safety and transactional integrity.

### 1. Donor Workflow (Supply)
1. **Login/Registration**: Donor authenticates via JWT.
2. **Creation**: Donor submits surplus food details (category, kg, prep time, expiration, location).
3. **Assessment**: The Backend Risk Engine verifies the data. If the food is safe, it enters the `AVAILABLE` state and is mapped geospatially.

### 2. NGO Workflow (Demand)
1. **Discovery**: NGO logs in and queries the backend. PostGIS filters available donations within their specific radius.
2. **Matching**: The Recommendation Engine scores and sorts the available food based on the NGO's specific needs.
3. **Claiming**: NGO claims a donation. The database initiates an atomic transaction to lock the row, moving it to `CLAIMED` and preventing any other NGO from seeing it.

### 3. Fulfillment Lifecycle
1. **Assignment**: The NGO assigns a volunteer or pickup vehicle (`PICKUP_ASSIGNED`).
2. **Transit**: Food is picked up and in transit (`PICKED_UP`).
3. **Completion**: Food is delivered to the community, and the transaction is closed (`COMPLETED`).
4. **Reputation**: Both the Donor and NGO rate the transaction, updating their platform Impact Scores.

---

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18 (TypeScript) via Vite
- **Styling**: Vanilla CSS with modern Glassmorphism UI
- **State/Routing**: React Router DOM, Context API
- **Icons**: Lucide React
- **Deployment**: Vercel

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Security**: JWT (JSON Web Tokens), bcrypt (Password Hashing)
- **Deployment**: Render

### Database
- **Engine**: PostgreSQL 15
- **Extensions**: PostGIS (Geospatial querying)
- **Hosting**: Neon.tech (Serverless Postgres)

---

## 🚀 How to Fork and Run Locally

Want to contribute or run your own instance of the Food Rescue Platform? Follow these steps:

### 1. Fork the Repository
1. Click the `Fork` button at the top right of this repository.
2. Clone your forked repository to your local machine:
   ```bash
   git clone https://github.com/YOUR-USERNAME/food-distribution-app.git
   cd food-distribution-app
   ```

### 2. Database Setup (Neon / Local)
1. Create a new PostgreSQL database. If using a cloud provider like [Neon](https://neon.tech), ensure the **PostGIS** extension is supported.
2. Connect to your database and execute the initialization script to build the architecture:
   ```bash
   # You can run this from your SQL client or via the provided migration script
   npx tsx backend/migrate.ts
   ```

### 3. Backend Setup
1. Open the `/backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Create a `.env` file based on `.env.example`.
   - Add your `DATABASE_URL`, `JWT_SECRET`, and `JWT_ACCESS_SECRET`.
4. Start the backend development server:
   ```bash
   npm run dev
   ```

### 4. Frontend Setup
1. Open a new terminal and navigate to the `/frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Create a `.env` file.
   - Add `VITE_API_URL=http://localhost:3000` (or your backend URL).
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to `http://localhost:5173`.

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
