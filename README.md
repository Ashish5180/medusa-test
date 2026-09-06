# 🏛️ Medusa v2 Unified Multi-Vertical Commerce Engine (PERN)

A unified, production-grade commerce backend built with **Medusa v2 (v2.20.1)** and **Neon Cloud PostgreSQL (Postgres 18.6)**. It natively powers four business verticals in a single monolithic architecture:

1. 🛍️ **Physical Goods & Retail:** Core Medusa products, variants, carts, checkouts, and fulfillment.
2. 🕒 **Equipment & Asset Rentals:** Daily rate calculations, security deposit escrow, reservation date checking, and return damage inspections.
3. 📅 **Service Appointments & Scheduling:** Specialist/provider calendar slots, capacity limits, and real-time customer bookings.
4. ✨ **Events & Ticketing:** Venue capacity tracking, tiered badge allocation, cryptographic ticket codes (`TCK-...`), and gate pass check-in scanners.

---

## 📑 Table of Contents
- [What We Have Done](#-what-we-have-done)
- [Tech Stack & Architecture](#-tech-stack--architecture)
- [Why Medusa vs. Custom Express/Node APIs?](#-why-medusa-vs-custom-expressnode-apis)
- [Are Rentals, Appointments & Events Customizable?](#-are-rentals-appointments--events-customizable)
- [Project Directory Structure](#-project-directory-structure)
- [Quickstart & Operations Guide](#-quickstart--operations-guide)
- [API Reference](#-api-reference)

---

## 🚀 What We Have Done

### 1. Custom Domain Modules (`src/modules/`)
* **`rental` Module (`src/modules/rental`)**:
  - **Models:** `RentalItem` (daily rates, refundable deposits, min rental days, condition grades) and `RentalBooking` (start/end dates, order links, deposit statuses: `held`/`refunded`/`forfeited`, rental statuses: `active`/`returned`/`overdue`).
  - **Service:** Availability overlapping date-range checks, quote calculations, and return inspections with damage fee deductions.
* **`appointment` Module (`src/modules/appointment`)**:
  - **Models:** `ServiceSlot` (specialist/resource assignment, time windows, max capacity, booked count) and `AppointmentBooking` (customer information, confirmations, order links, statuses).
  - **Service:** Overbooking prevention, capacity tracking, slot reservation, and appointment cancellations with capacity release.
* **`event` Module (`src/modules/event`)**:
  - **Models:** `Event` (venues, dates, seat capacities, tickets issued count) and `EventTicket` (attendee details, tiers, cryptographic ticket codes `TCK-XXXX-XXXXXXXX`, gate scan timestamps).
  - **Service:** Ticket issuance, capacity limits, sold-out enforcement, and admission check-in validation.

### 2. Cross-Domain Remote Links (`src/links/`)
Unified all verticals with Medusa's native catalog via Remote Links:
- `product` &harr; `rental_item` (`product_product_rentalmodule_rental_item`)
- `product` &harr; `service_slot` (`product_product_appointmentmodule_service_slot`)
- `product` &harr; `event` (`product_product_eventmodule_event`)

### 3. Native Medusa v2 Admin UI Extensions (`src/admin/routes/`)
Built 3 interactive dashboard pages with `@medusajs/admin-sdk`, `@medusajs/ui`, and `@medusajs/icons`:
- **🕒 Rentals (`/app/rentals`):** Real-time metrics (Active bookings, catalog items, security deposits in escrow), asset configuration form, manual booking creator, and return inspection/deposit-release modal.
- **📅 Appointments (`/app/appointments`):** Specialist provider schedule manager, slot creator, open seat trackers, and client appointment booking tool.
- **✨ Events & Tickets (`/app/events`):** Event creator, ticket issuance tool, and interactive real-time **Gate Pass Scanner** that validates attendee codes and records admission timestamps.

### 4. Database Setup & Automated Seed
- Connected to serverless **Neon Cloud PostgreSQL** with SSL.
- Generated and executed **130 database tables** across core commerce and custom vertical modules.
- Seeded demo data:
  - Default store, regions, sales channels, products, inventory levels.
  - Rental items: Sony Cinema FX3 & Laser 4K Projector.
  - Appointment slots: Consultation slots with Dr. Maya Patel.
  - Events: "AI & Modern Commerce Summit 2026" with issued VIP passes.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Framework** | **Medusa v2 (v2.20.1)** | Modular commerce engine, Workflows, Remote Links & Queries |
| **Database** | **Neon Cloud PostgreSQL 18.6** | Serverless cloud relational database with SSL connection pooling |
| **ORM & Migrations** | **MikroORM via Medusa DML** | Code-first declarative schemas (`model.define`) & migrations |
| **Admin Frontend** | **Vite + React 18 + Medusa UI** | Built-in extensible dashboard with `@medusajs/ui` design system |
| **Language & Tooling** | **TypeScript 5.6 + SWC** | End-to-end type safety across backend and admin extensions |
| **Testing** | **Jest 29 + SWC** | Passing unit test suites for all 3 domain services |

---

## ⚖️ Why Medusa vs. Custom Express/Node APIs?

Why did we use Medusa v2 instead of writing custom Node.js / Express routes from scratch?

| Feature / Requirement | Custom Node / Express API | Medusa v2 (What We Used) |
| :--- | :--- | :--- |
| **Core Commerce Primitives** | ❌ Must write from scratch: Carts, checkout, taxes, discounts, order states, line items, returns. |  **Out of the Box:** Battle-tested cart calculations, multi-currency pricing, and order management. |
| **Admin Dashboard UI** | ❌ Must build and maintain a separate React/Next.js admin portal from scratch (~3-6 months work). |  **Out of the Box:** Pre-built, authenticated admin dashboard with custom sidebar routes and widgets. |
| **Data Relationships** | ⚠️ Messy custom SQL JOINs or microservice HTTP calls across separate tables. |  **Remote Links & Remote Query (`query.graph`):** Declarative joins between core Products and custom Rentals/Events. |
| **Transactional Integrity** | ❌ Complex try/catch blocks; if payment succeeds but booking fails, data gets out of sync. |  **Medusa Workflows:** Distributed multi-step transactions with automatic compensation (rollback) steps. |
| **Payment & Fulfillment** | ❌ Must integrate and maintain custom Stripe/PayPal/ShipStation webhooks. |  **Plugin Ecosystem:** Drop-in payment and shipping providers with standard provider interfaces. |
| **Time to Market** | ⏳ **6 to 12 months** of foundational development. | ⚡ **Days to Weeks:** Focus 100% on business logic (Rentals, Bookings, Tickets). |

### The "PERN" Advantage
Medusa is essentially a specialized, structured Express/Node framework. By using Medusa's **Module Architecture**:
- You don't sacrifice flexibility: you can still write custom Express-like REST endpoints (`src/api/**`).
- You get enterprise-grade database migrations, authentication, RBAC, background jobs, and remote queries for free.

---

## 🧩 Are Rentals, Appointments & Events Customizable?

### **YES — 100% Fully Customizable.**

Because Rentals, Appointments, and Events are built as **first-class Medusa Modules**, they are not locked into any rigid structure. Here is how you can customize them:

### 1. Adding Custom Fields (DML Models)
Want to add an `insurance_policy_number` to rentals or a `zoom_meeting_url` to appointments?
Simply edit the model in `src/modules/<module>/models/`:

```typescript
// Example: Adding fields to AppointmentBooking
export const AppointmentBooking = model.define("appointment_booking", {
  id: model.id().primaryKey(),
  slot_id: model.text(),
  // Add new fields:
  zoom_meeting_url: model.text().nullable(),
  reminder_sent: model.boolean().default(false),
  cancellation_reason: model.text().nullable(),
})
```
Run `npx medusa db:generate appointmentModuleService && npx medusa db:migrate` and your database schema updates automatically!

### 2. Custom Business Logic (Module Services)
All business rules live in pure TypeScript classes in `src/modules/<module>/service.ts`:
- **Custom Rental Pricing:** Implement dynamic weekend pricing, seasonal discount tiers, or hourly billing.
- **Custom Scheduling:** Add automated 15-minute buffer times between appointments or sync with Google Calendar / Outlook.
- **Custom Event Ticketing:** Add seating maps (Row/Seat numbers), early-bird price drops, or QR code image generation.

### 3. Event-Driven Automation (Subscribers & Workflows)
You can listen to any system event or custom trigger:
- When a rental is overdue &rarr; Send an automated reminder email via Resend/SendGrid.
- When an appointment is booked &rarr; Send an SMS confirmation with Twilio.
- When an event ticket is scanned &rarr; Trigger a real-time webhook to a venue display screen.

### 4. Admin UI Customization
The Admin UI in `src/admin/routes/` is built using standard React. You can:
- Add new filter tabs, date pickers, or CSV export buttons.
- Create **Admin Widgets** (`src/admin/widgets/`) to inject rental pricing or appointment booking forms directly into the core Medusa Product detail page!

---

## 📂 Project Directory Structure

The project has been cleaned and organized. Unnecessary boilerplate template files have been removed:

```
backend/apps/backend/
├── .env                                 # Environment variables (Neon DB URL, Secrets, CORS)
├── medusa-config.ts                     # Core configuration, registered modules & plugins
├── package.json                         # Dependencies & scripts
├── tsconfig.json                        # Backend TypeScript configuration
├── src/
│   ├── admin/                           # 🖥️ ADMIN DASHBOARD EXTENSIONS (React + Medusa UI)
│   │   ├── routes/
│   │   │   ├── rentals/page.tsx         # /app/rentals dashboard & inspection tool
│   │   │   ├── appointments/page.tsx    # /app/appointments calendar & booking tool
│   │   │   └── events/page.tsx          # /app/events management & gate scanner
│   │   ├── tsconfig.json                # Frontend TypeScript configuration
│   │   └── vite-env.d.ts
│   │
│   ├── modules/                         # 🧠 DOMAIN MODULES (DML Models & Services)
│   │   ├── rental/                      # RentalItem, RentalBooking models, service & migrations
│   │   ├── appointment/                 # ServiceSlot, AppointmentBooking models & service
│   │   └── event/                       # Event, EventTicket models & service
│   │
│   ├── links/                           # 🔗 REMOTE LINKS (Joining custom modules with Products)
│   │   ├── product-rental.ts
│   │   ├── product-appointment.ts
│   │   └── product-event.ts
│   │
│   ├── workflows/                       # ⚙️ TRANSACTIONAL WORKFLOWS (Multi-step rollback flows)
│   │   ├── rentals/create-rental-booking.ts
│   │   ├── appointments/reserve-appointment.ts
│   │   └── events/issue-event-ticket.ts
│   │
│   ├── api/                             # 🌐 REST ENDPOINTS
│   │   ├── admin/                       # Protected admin routes (Inspections, Calendar, Tickets)
│   │   └── store/                       # Public storefront routes (Quotes, Slots, Availability)
│   │
│   └── migration-scripts/               # 🌱 SEED SCRIPTS
│       ├── initial-data-seed.ts         # Medusa core store, regions, and products seed
│       └── seed-multi-vertical.ts       # Rentals, Appointments, and Events demo seed
```

---

## ⚡ Quickstart & Operations Guide

### 1. Install & Setup
From `backend/apps/backend`:
```bash
# Verify packages are installed
npm install
```

### 2. Database Migrations
To generate migrations when you change models:
```bash
# Generate migrations for custom modules
npx medusa db:generate rentalModuleService appointmentModuleService eventModuleService

# Apply migrations & sync links
npx medusa db:migrate
npx medusa db:sync-links
```

### 3. Create Admin User
```bash
npx medusa user --email admin@baba.ai --password YourSecurePassword123
```

### 4. Run Development Server
```bash
npm run dev
```
- **Backend API:** `http://localhost:9000`
- **Admin Dashboard:** `http://localhost:9000/app`

### 5. Run Automated Tests
```bash
npm run test:unit
```
All 11 unit tests across rental calculations, appointment bookings, and ticket issuance will run and validate in under 2 seconds.

---

## 📡 API Reference Summary

### Storefront Public Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/store/rentals/calculate-quote` | Calculate daily rental fees & security deposit |
| `POST` | `/store/rentals/book` | Customer rental checkout & reservation |
| `GET` | `/store/appointments/slots` | Fetch open appointment time slots |
| `POST` | `/store/appointments/book` | Book customer appointment |
| `GET` | `/store/events` | List upcoming events |
| `GET` | `/store/events/:id/availability` | Check remaining seat capacity |
| `POST` | `/store/events/tickets` | Purchase / issue event ticket |

### Admin Protected Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/admin/rentals` | List all rental catalog items & customer bookings |
| `POST` | `/admin/rentals` | Configure a new rental asset (rates & deposits) |
| `POST` | `/admin/rentals/bookings` | Create manual booking reservation |
| `POST` | `/admin/rentals/inspections` | Process returned items, deduct damage & release escrow |
| `GET` | `/admin/appointments/calendar` | List specialist schedules & bookings |
| `POST` | `/admin/appointments/calendar` | Create new provider calendar time slot |
| `POST` | `/admin/appointments/bookings` | Manually book a client appointment |
| `GET` | `/admin/events` | List all events & issued attendee tickets |
| `POST` | `/admin/events` | Publish a new event with venue & capacity |
| `POST` | `/admin/events/tickets` | Issue an attendee ticket badge |
| `POST` | `/admin/events/checkin` | Real-time gate scanner verification & admission |
