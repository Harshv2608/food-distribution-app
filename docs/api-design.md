# API Design Contract

This document outlines the REST API endpoints required for the MVP. Endpoints are grouped by module and derived directly from the exact user journeys.

## 1. Authentication (`/api/v1/auth`)

* `POST /api/v1/auth/register` - Register a new user (Donor or NGO).
* `POST /api/v1/auth/login` - Authenticate user and return JWT + Refresh Token.
* `POST /api/v1/auth/refresh` - Refresh access token.
* `POST /api/v1/auth/logout` - Invalidate tokens.
* `GET /api/v1/auth/me` - Get current user profile.

## 2. Donations (`/api/v1/donations`)

* `POST /api/v1/donations` - Quick create a new donation (Requires DONOR role).
* `GET /api/v1/donations/:id` - View single donation details.
* `PATCH /api/v1/donations/:id` - Edit an existing donation (only if status is CREATED or AVAILABLE).
* `POST /api/v1/donations/:id/cancel` - Cancel a donation.
* `GET /api/v1/donations/history` - View past donations for the current Donor.

## 3. Discovery & Matching (`/api/v1/discovery`)

* `GET /api/v1/discovery/nearby` - Find nearby `AVAILABLE` donations (Requires NGO role, uses PostGIS).
* `GET /api/v1/discovery/matches` - Returns algorithmically ranked recommendations for the NGO (Computed dynamically, not stored in DB).

## 4. Claims (`/api/v1/claims`)

* `POST /api/v1/donations/:id/claim` - Attempt to claim a donation (Requires NGO role, executed inside a database transaction).
* `GET /api/v1/claims` - List active/past claims for the current user.
* `GET /api/v1/claims/:id` - View specific claim details.

## 5. Pickups (`/api/v1/pickups`)

* `GET /api/v1/pickups` - List pickups assigned to the NGO/Donor.
* `POST /api/v1/pickups/:id/assign` - NGO assigns a driver/personnel for the pickup.
* `POST /api/v1/pickups/:id/pickup` - Mark as physically collected (`PICKED_UP`).
* `POST /api/v1/pickups/:id/complete` - Mark as delivered (`DELIVERED` / `COMPLETED`), triggering impact score calculation.

## 6. Profiles & Settings (`/api/v1/profiles`)

* `PATCH /api/v1/profiles/donor` - Update donor defaults (e.g., typical prep time).
* `PATCH /api/v1/profiles/ngo` - Update NGO requirements and radius.

## 7. Admin (`/api/v1/admin`)

* `GET /api/v1/admin/users` - List users for verification.
* `PATCH /api/v1/admin/users/:id/verify` - Approve an NGO/Donor.
* `GET /api/v1/admin/metrics` - High-level platform statistics.

---
**Standard Error Response Format:**
```json
{
  "success": false,
  "error": {
    "code": "DONATION_CLAIMED",
    "message": "This donation has already been claimed by another NGO."
  }
}
```
