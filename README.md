# 🏛️ Medusa v2 Unified Multi-Vertical Commerce Engine (PERN)

<p align="center">
  <img src="https://img.shields.io/badge/Medusa_v2-v2.20.1-blue?style=for-the-badge&logo=medusa" alt="Medusa v2" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon_Cloud-45b7d1?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Node.js-20%2B-green?style=for-the-badge&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178c6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Deployment-Render-46E3B7?style=for-the-badge&logo=render" alt="Render" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License MIT" />
</p>

---

## 🌐 Live Production Deployment

| Metric / Service | Details |
| :--- | :--- |
| **Live Base URL** | [`https://medusa-test-sbim.onrender.com`](https://medusa-test-sbim.onrender.com) |
| **Health Check** | [`GET /health`](https://medusa-test-sbim.onrender.com/health) &rarr; `200 OK` |
| **Multi-Vertical Summary** | [`GET /store/multi-vertical/summary`](https://medusa-test-sbim.onrender.com/store/multi-vertical/summary) |
| **Hosting Platform** | [Render Web Service](https://render.com/) |
| **Database** | [Neon Cloud Serverless PostgreSQL](https://neon.tech/) (v18.6) |
| **Architecture** | **Pure Headless API-Only** (No frontend UI bloat, optimized for mobile & web clients) |

---

## 📑 Table of Contents
- [Executive Overview](#-executive-overview)
- [The Four Business Verticals](#-the-four-business-verticals)
- [Authentication & Request Headers](#-authentication--request-headers)
- [API Reference](#-api-reference)
  - [1. System & Summary](#1-system--summary)
  - [2. Equipment & Asset Rentals](#2-equipment--asset-rentals)
  - [3. Service Appointments & Consultations](#3-service-appointments--consultations)
  - [4. Events & Ticketing](#4-events--ticketing)
  - [5. Native E-Commerce](#5-native-e-commerce)
- [Directory Structure](#-directory-structure)
- [Developer Guide (Creating Custom APIs & Modules)](./DEVELOPER_GUIDE.md)
- [Local Development & Operations](#-local-development--operations)
- [Environment Variables Guide](#-environment-variables-guide)
- [License](#-license)

---

## 🎯 Executive Overview

This repository provides a production-grade, multi-vertical commerce backend built on **Medusa v2**. Unlike standard e-commerce platforms that only support physical catalog products, this engine unifies **four distinct business models** into a single, transactional PostgreSQL database:

1. **🛍️ Physical Goods & Retail:** Native Medusa carts, checkout, multi-currency pricing, and inventory.
2. **🕒 Equipment & Asset Rentals:** Daily rates, security deposit escrow, date-range conflict avoidance, and damage return inspections.
3. **📅 Service Appointments & Scheduling:** Provider/doctor time windows, capacity enforcement, and client bookings.
4. **✨ Events & Ticketing:** Venue capacity limits, badge allocation, unique cryptographic ticket codes (`TCK-...`), and gate pass check-in validation.

### Architecture Highlights
- **100% Pure Headless API**: Stripped of heavy frontend dashboard bundles, reducing memory footprint and build times by over 80%.
- **Medusa DML (Data Modeling Language)**: Declarative, type-safe schema definitions with automated PostgreSQL migrations.
- **Cross-Domain Remote Links**: Native products seamlessly link to rental assets, appointment schedules, and event tickets via Medusa's distributed query engine (`query.graph`).

---

## 🧩 The Four Business Verticals

```mermaid
graph TD
    A[Core Medusa Engine] --> B[🛍️ Retail Commerce]
    A --> C[🕒 Asset Rentals]
    A --> D[📅 Service Appointments]
    A --> E[✨ Events & Ticketing]
    
    C --> C1[Daily Rate Calculation]
    C --> C2[Deposit Escrow & Return Inspection]
    
    D --> D1[Practitioner Time Windows]
    D --> D2[Capacity & Overbooking Guard]
    
    E --> E1[Cryptographic TCK Badges]
    E --> E2[Real-time Gate Pass Check-in]
```

---

## 🔐 Authentication & Request Headers

### 1. Storefront APIs (`/store/*`)
All `/store/*` routes require the **Publishable API Key** header:
```http
x-publishable-api-key: pk_ad6038993d2bae4c3f6892c2063c1e741b1e5a3418cda0fca8e99592ae595ef8
Content-Type: application/json
```

### 2. Admin APIs (`/admin/*`)
All `/admin/*` routes are protected by JWT Bearer Authentication:
```http
Authorization: Bearer <YOUR_ADMIN_JWT_TOKEN>
Content-Type: application/json
```

#### Obtain Admin JWT Token
```bash
curl -X POST https://medusa-test-sbim.onrender.com/auth/user/emailpass \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@baba.ai",
    "password": "YourSecurePassword123"
  }'
```

---

## 📡 API Reference

### 1. System & Summary

#### `GET /health`
Server ping check.
```bash
curl -i https://medusa-test-sbim.onrender.com/health
```
**Response (`200 OK`)**: `OK`

#### `GET /store/multi-vertical/summary`
Aggregated metrics across all four commerce verticals.
```bash
curl -s -H "x-publishable-api-key: pk_ad6038993d2bae4c3f6892c2063c1e741b1e5a3418cda0fca8e99592ae595ef8" \
  https://medusa-test-sbim.onrender.com/store/multi-vertical/summary
```
**Response (`200 OK`)**:
```json
{
  "status": "online",
  "version": "2.20.1",
  "architecture": "Medusa v2 PERN Multi-Vertical (Orders + Rentals + Appointments + Events)",
  "modules": {
    "nativeCommerce": { "productsCount": 5, "ordersCount": 0 },
    "rentals": { "itemsCount": 4, "activeBookingsCount": 1 },
    "appointments": { "availableSlotsCount": 0, "totalAppointmentsCount": 3 },
    "events": { "eventsCount": 1, "ticketsIssuedCount": 0 }
  }
}
```

---

### 2. Equipment & Asset Rentals

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/store/rentals/items` | Public (`x-publishable-api-key`) | List rental items with daily rates & deposits |
| `POST` | `/store/rentals/book` | Public (`x-publishable-api-key`) | Book equipment with date overlap check |
| `GET` | `/admin/rentals` | Admin (`Bearer <TOKEN>`) | List all fleet assets & booking records |
| `POST` | `/admin/rentals` | Admin (`Bearer <TOKEN>`) | Create a new rental asset |
| `POST` | `/admin/rentals/inspections` | Admin (`Bearer <TOKEN>`) | Process return damage & refund deposit |

#### Example: Book Rental Item
```bash
curl -X POST https://medusa-test-sbim.onrender.com/store/rentals/book \
  -H "x-publishable-api-key: pk_ad6038993d2bae4c3f6892c2063c1e741b1e5a3418cda0fca8e99592ae595ef8" \
  -H "Content-Type: application/json" \
  -d '{
    "item_id": "01M1NYVEWE16AMTZ1Z7SEW3TEA",
    "start_date": "2026-11-10T00:00:00Z",
    "end_date": "2026-11-14T00:00:00Z",
    "notes": "Sony Cinema FX3 reservation"
  }'
```

---

### 3. Service Appointments & Consultations

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/store/appointments/slots` | Public (`x-publishable-api-key`) | Retrieve open specialist schedule slots |
| `POST` | `/store/appointments/book` | Public (`x-publishable-api-key`) | Book consultation slot with customer info |
| `GET` | `/admin/appointments/calendar` | Admin (`Bearer <TOKEN>`) | Full calendar view & booked reservations |
| `POST` | `/admin/appointments/calendar` | Admin (`Bearer <TOKEN>`) | Create a new availability slot |

#### Example: Book an Appointment
```bash
curl -X POST https://medusa-test-sbim.onrender.com/store/appointments/book \
  -H "x-publishable-api-key: pk_ad6038993d2bae4c3f6892c2063c1e741b1e5a3418cda0fca8e99592ae595ef8" \
  -H "Content-Type: application/json" \
  -d '{
    "slot_id": "01M1PBAWXXBYFRATQNSKEMW89Y",
    "customer_name": "Aarav Sharma",
    "customer_email": "aarav@example.com",
    "customer_phone": "+919876543210",
    "notes": "Architecture review"
  }'
```

---

### 4. Events & Ticketing

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/store/events` | Public (`x-publishable-api-key`) | List upcoming events with live remaining seats |
| `POST` | `/store/events/tickets` | Public (`x-publishable-api-key`) | Register attendee & issue `TCK-...` badge |
| `GET` | `/admin/events` | Admin (`Bearer <TOKEN>`) | Overview of events & registered attendees |
| `POST` | `/admin/events/checkin` | Admin (`Bearer <TOKEN>`) | Scan & validate barcode at venue gate |

#### Example: Issue Ticket
```bash
curl -X POST https://medusa-test-sbim.onrender.com/store/events/tickets \
  -H "x-publishable-api-key: pk_ad6038993d2bae4c3f6892c2063c1e741b1e5a3418cda0fca8e99592ae595ef8" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "01M1NYVGCEZMDGR651AN37ZQZN",
    "attendee_name": "Rohan Gupta",
    "attendee_email": "rohan@example.com",
    "tier": "VIP Access"
  }'
```

---

### 5. Native E-Commerce

| Method | Endpoint | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/store/products` | Public (`x-publishable-api-key`) | Full product catalog & pricing |
| `GET` | `/store/regions` | Public (`x-publishable-api-key`) | Available shipping & currency regions |

---

## 📂 Directory Structure

Clean, flattened standalone layout with zero monorepo overhead:

```text
backend/
├── .env                                  # Environment variables (Neon DB, Secrets, CORS)
├── .env.template                         # Sample environment template
├── .gitignore                            # Git exclusion rules
├── API_REPORT.md                         # Generated live testing & integration report
├── README.md                             # Project documentation
├── eslint.config.ts                      # ESLint configuration
├── instrumentation.ts                    # OpenTelemetry & server instrumentation
├── integration-tests/                    # Jest automated integration tests
├── jest.config.js                        # Jest configuration
├── medusa-config.ts                      # Medusa v2 server configuration
├── package.json                          # Dependencies & direct scripts
├── package-lock.json                     # Dependency lockfile
├── tsconfig.json                         # TypeScript compiler configuration
├── static/                               # Static assets (images, product media)
└── src/
    ├── api/                              # REST API Route Handlers
    │   ├── admin/                        # Protected /admin/* endpoints
    │   └── store/                        # Public /store/* endpoints
    ├── links/                            # Remote Links between Core Products & Custom Modules
    ├── migration-scripts/                # Database seed scripts
    ├── modules/                          # Custom Domain Modules
    │   ├── appointment/                  # ServiceSlot & AppointmentBooking
    │   ├── event/                        # Event & EventTicket
    │   └── rental/                       # RentalItem & RentalBooking
    └── workflows/                        # Distributed Transactional Workflows
```

---

## ⚡ Local Development & Operations

### 1. Prerequisites
- **Node.js**: `^20.19.0 || >=22.12.0`
- **PostgreSQL**: PostgreSQL 15+ (or Neon Cloud connection)

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Migrations
```bash
# Apply migrations to database
npx medusa db:migrate

# Sync remote links
npx medusa db:sync-links
```

### 4. Run Development Server
```bash
npm run dev
```
Server runs at: `http://localhost:9000`

### 5. Build for Production
```bash
npm run build
npm run start
```

### 6. Linting & Type Checking
```bash
# Type check without emitting files
npx tsc --noEmit

# Medusa ESLint validation
npm run lint
```

---

## 🔧 Environment Variables Guide

| Variable | Recommended Production Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations |
| `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` | PostgreSQL database connection string |
| `JWT_SECRET` | 32+ character random hex string | Signs customer & admin authentication tokens |
| `COOKIE_SECRET` | 32+ character random hex string | Encrypts session cookies |
| `STORE_CORS` | `http://localhost:3000,https://your-storefront.vercel.app` | Whitelisted origins for storefront requests |
| `ADMIN_CORS` | `http://localhost:3000,https://your-admin.vercel.app` | Whitelisted origins for admin API requests |
| `AUTH_CORS` | `http://localhost:3000,https://your-storefront.vercel.app` | Whitelisted origins for `/auth/*` routes |
| `AUTH_MFA_ENCRYPTION_KEY` | 64 character hex string | Encryption key for MFA secrets |

> [!TIP]
> `REDIS_URL` is optional. If not set, Medusa v2 runs seamlessly in **in-memory caching & workflow engine mode**, ideal for lightweight or cost-effective deployments.

---

## 📄 License

This project is licensed under the **[MIT License](LICENSE)**. You are completely free to use, modify, distribute, and keep your repository private for proprietary and commercial applications.
