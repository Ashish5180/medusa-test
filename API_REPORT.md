# 🚀 Live API Reference & Deployment Report

**Backend Live Base URL**: `https://medusa-test-sbim.onrender.com`  
**Platform**: Render (Web Service)  
**Framework**: Medusa v2 (`v2.20.1`) — Pure API-Only Architecture  
**Database**: Neon Cloud PostgreSQL (Postgres 18.6)  
**Status**: 🟢 **Healthy & Operational (HTTP 200)**  
**Report Generated**: September 6, 2026  

---

## 🔐 Authentication & API Headers

### 1. Store APIs (`/store/*`)
All `/store/*` routes require the **Publishable API Key** in the request headers:
```http
x-publishable-api-key: pk_ad6038993d2bae4c3f6892c2063c1e741b1e5a3418cda0fca8e99592ae595ef8
Content-Type: application/json
```

### 2. Admin APIs (`/admin/*`)
All `/admin/*` routes require a **JWT Bearer Token** in the `Authorization` header:
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Admin Login (Generate Token)
- **Method & Path**: `POST /auth/user/emailpass`
- **Request Body**:
  ```json
  {
    "email": "admin@baba.ai",
    "password": "YourSecurePassword123"
  }
  ```
- **Response**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

---

## 📊 1. System & Multi-Vertical Summary

### `GET /health`
Health check endpoint to verify that the server is up and responsive.
- **Request**:
  ```bash
  curl -i https://medusa-test-sbim.onrender.com/health
  ```
- **Response** (`200 OK`):
  ```text
  OK
  ```

---

### `GET /store/multi-vertical/summary`
Aggregated high-level status across all 4 verticals (Commerce, Rentals, Appointments, Events).
- **Request**:
  ```bash
  curl -s -H "x-publishable-api-key: pk_ad6038993d2bae4c3f6892c2063c1e741b1e5a3418cda0fca8e99592ae595ef8" \
    https://medusa-test-sbim.onrender.com/store/multi-vertical/summary
  ```
- **Live Response** (`200 OK`):
  ```json
  {
    "status": "online",
    "version": "2.20.1",
    "architecture": "Medusa v2 PERN Multi-Vertical (Orders + Rentals + Appointments + Events)",
    "modules": {
      "nativeCommerce": {
        "productsCount": 5,
        "ordersCount": 0
      },
      "rentals": {
        "itemsCount": 4,
        "activeBookingsCount": 1
      },
      "appointments": {
        "availableSlotsCount": 0,
        "totalAppointmentsCount": 3
      },
      "events": {
        "eventsCount": 1,
        "ticketsIssuedCount": 0
      }
    }
  }
  ```

---

## 🕒 2. Equipment & Asset Rentals APIs

### `GET /store/rentals/items`
Retrieve all available rental items with rates, deposit requirements, and condition grade.
- **Request**:
  ```bash
  curl -s -H "x-publishable-api-key: pk_ad6038993d2bae4c3f6892c2063c1e741b1e5a3418cda0fca8e99592ae595ef8" \
    https://medusa-test-sbim.onrender.com/store/rentals/items
  ```
- **Live Response** (`200 OK`):
  ```json
  {
    "items": [
      {
        "id": "01M1NYVEWE16AMTZ1Z7SEW3TEA",
        "deposit_amount": 300,
        "daily_rate": 75,
        "min_rental_days": 2,
        "condition_grade": "Mint / Professional",
        "is_active": true
      },
      {
        "id": "01M1NYVF6PV6HSYJAXZ974MDB8",
        "deposit_amount": 150,
        "daily_rate": 45,
        "min_rental_days": 1,
        "condition_grade": "Excellent",
        "is_active": true
      }
    ]
  }
  ```

---

### `POST /store/rentals/book`
Reserve a rental item for a date range with automatic conflict checking.
- **Request**:
  ```bash
  curl -s -X POST https://medusa-test-sbim.onrender.com/store/rentals/book \
    -H "x-publishable-api-key: pk_ad6038993d2bae4c3f6892c2063c1e741b1e5a3418cda0fca8e99592ae595ef8" \
    -H "Content-Type: application/json" \
    -d '{
      "item_id": "01M1NYVEWE16AMTZ1Z7SEW3TEA",
      "start_date": "2026-11-10T00:00:00Z",
      "end_date": "2026-11-14T00:00:00Z",
      "notes": "Customer web reservation"
    }'
  ```

---

### `GET /admin/rentals`
Admin endpoint to list all rental fleet assets and existing booking records.
- **Request**:
  ```bash
  curl -s -H "Authorization: Bearer <TOKEN>" \
    https://medusa-test-sbim.onrender.com/admin/rentals
  ```

---

### `POST /admin/rentals/inspections`
Post-return damage and deposit resolution check by warehouse/admin staff.
- **Request**:
  ```bash
  curl -s -X POST https://medusa-test-sbim.onrender.com/admin/rentals/inspections \
    -H "Authorization: Bearer <TOKEN>" \
    -H "Content-Type: application/json" \
    -d '{
      "booking_id": "01M1NZPRZDCWEBS9Y066YET1Q7",
      "condition_on_return": "Good / Minor wear",
      "damage_fee": 0,
      "deposit_status": "refunded"
    }'
  ```

---

## 📅 3. Service Appointments & Scheduling APIs

### `GET /store/appointments/slots`
Fetch schedule slots for consultation, service, or doctor booking.
- **Request**:
  ```bash
  curl -s -H "x-publishable-api-key: pk_ad6038993d2bae4c3f6892c2063c1e741b1e5a3418cda0fca8e99592ae595ef8" \
    https://medusa-test-sbim.onrender.com/store/appointments/slots
  ```
- **Live Response** (`200 OK`):
  ```json
  {
    "slots": [
      {
        "id": "01M1PBAWXXBYFRATQNSKEMW89Y",
        "service_id": "srv_general",
        "resource_name": "Dr. Maya Patel",
        "slot_start": "2026-10-02T03:30:00.000Z",
        "slot_end": "2026-10-02T04:30:00.000Z",
        "max_capacity": 1,
        "booked_count": 1,
        "is_blocked": false
      }
    ]
  }
  ```

---

### `POST /store/appointments/book`
Book an open slot with customer details.
- **Request**:
  ```bash
  curl -s -X POST https://medusa-test-sbim.onrender.com/store/appointments/book \
    -H "x-publishable-api-key: pk_ad6038993d2bae4c3f6892c2063c1e741b1e5a3418cda0fca8e99592ae595ef8" \
    -H "Content-Type: application/json" \
    -d '{
      "slot_id": "01M1PBAWXXBYFRATQNSKEMW89Y",
      "customer_name": "Aarav Sharma",
      "customer_email": "aarav@example.com",
      "customer_phone": "+919876543210",
      "notes": "Initial consultation request"
    }'
  ```

---

### `GET /admin/appointments/calendar`
Admin view of full calendar schedule, practitioner availability, and confirmed bookings.
- **Request**:
  ```bash
  curl -s -H "Authorization: Bearer <TOKEN>" \
    https://medusa-test-sbim.onrender.com/admin/appointments/calendar
  ```

---

### `POST /admin/appointments/calendar`
Admin endpoint to open and schedule new availability slots.
- **Request**:
  ```bash
  curl -s -X POST https://medusa-test-sbim.onrender.com/admin/appointments/calendar \
    -H "Authorization: Bearer <TOKEN>" \
    -H "Content-Type: application/json" \
    -d '{
      "service_id": "srv_general",
      "resource_name": "Dr. Maya Patel",
      "slot_start": "2026-11-01T10:00:00Z",
      "slot_end": "2026-11-01T11:00:00Z",
      "max_capacity": 1
    }'
  ```

---

## ✨ 4. Events & Ticketing APIs

### `GET /store/events`
List all published conferences, concerts, and workshops with live remaining capacity.
- **Request**:
  ```bash
  curl -s -H "x-publishable-api-key: pk_ad6038993d2bae4c3f6892c2063c1e741b1e5a3418cda0fca8e99592ae595ef8" \
    https://medusa-test-sbim.onrender.com/store/events
  ```
- **Live Response** (`200 OK`):
  ```json
  {
    "events": [
      {
        "id": "01M1NYVGCEZMDGR651AN37ZQZN",
        "title": "AI & Modern Commerce Summit 2026",
        "description": "Keynotes, live coding workshops, and networking for full-stack engineering leaders.",
        "venue": "Grand Convention Center, Hall 4 (Bangalore / Hybrid)",
        "event_start": "2026-09-18T03:30:00.000Z",
        "event_end": "2026-09-18T12:30:00.000Z",
        "total_capacity": 150,
        "tickets_issued": 0,
        "remainingCapacity": 150,
        "isSoldOut": false,
        "status": "published"
      }
    ]
  }
  ```

---

### `POST /store/events/tickets`
Purchase/issue a badge ticket with automated barcode/token generation (`TCK-...`).
- **Request**:
  ```bash
  curl -s -X POST https://medusa-test-sbim.onrender.com/store/events/tickets \
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

### `POST /admin/events/checkin`
Gate scanner check-in endpoint for validating tickets at venue entrance.
- **Request**:
  ```bash
  curl -s -X POST https://medusa-test-sbim.onrender.com/admin/events/checkin \
    -H "Authorization: Bearer <TOKEN>" \
    -H "Content-Type: application/json" \
    -d '{
      "ticket_code": "TCK-ABC123XYZ"
    }'
  ```

---

## 🛍️ 5. Native E-Commerce APIs

### `GET /store/products`
Fetch core Medusa catalog products, variants, and pricing.
- **Request**:
  ```bash
  curl -s -H "x-publishable-api-key: pk_ad6038993d2bae4c3f6892c2063c1e741b1e5a3418cda0fca8e99592ae595ef8" \
    "https://medusa-test-sbim.onrender.com/store/products?limit=5"
  ```

---

## 🛠️ Summary Matrix of Endpoints

| Category | Endpoint | Method | Auth / Header | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **System** | `/health` | `GET` | None | Server health ping |
| **Overview**| `/store/multi-vertical/summary` | `GET` | `x-publishable-api-key` | Aggregated count across all 4 verticals |
| **Auth** | `/auth/user/emailpass` | `POST` | None | Admin login -> returns JWT token |
| **Rentals** | `/store/rentals/items` | `GET` | `x-publishable-api-key` | List rental catalog |
| **Rentals** | `/store/rentals/book` | `POST` | `x-publishable-api-key` | Reserve rental equipment |
| **Rentals** | `/admin/rentals` | `GET`, `POST` | `Bearer <TOKEN>` | Manage rental fleet & bookings |
| **Rentals** | `/admin/rentals/inspections`| `POST` | `Bearer <TOKEN>` | Return condition & deposit release |
| **Appointments** | `/store/appointments/slots`| `GET` | `x-publishable-api-key` | List bookable consultation slots |
| **Appointments** | `/store/appointments/book` | `POST` | `x-publishable-api-key` | Book consultation slot |
| **Appointments** | `/admin/appointments/calendar` | `GET`, `POST` | `Bearer <TOKEN>` | Calendar view & create slots |
| **Events** | `/store/events` | `GET` | `x-publishable-api-key` | List public events & capacity |
| **Events** | `/store/events/tickets` | `GET`, `POST` | `x-publishable-api-key` | View & purchase event tickets |
| **Events** | `/admin/events` | `GET`, `POST` | `Bearer <TOKEN>` | Create & manage event registrations |
| **Events** | `/admin/events/checkin` | `POST` | `Bearer <TOKEN>` | Gate pass check-in validator |
| **Commerce** | `/store/products` | `GET` | `x-publishable-api-key` | Physical retail products & variants |

---

## 💻 Frontend Client Setup Example (JavaScript / Fetch)

```javascript
const BASE_URL = "https://medusa-test-sbim.onrender.com";
const PUBLISHABLE_KEY = "pk_ad6038993d2bae4c3f6892c2063c1e741b1e5a3418cda0fca8e99592ae595ef8";

// 1. Fetch multi-vertical summary
async function getSummary() {
  const res = await fetch(`${BASE_URL}/store/multi-vertical/summary`, {
    headers: {
      "x-publishable-api-key": PUBLISHABLE_KEY,
    },
  });
  return res.json();
}

// 2. Fetch rental items
async function getRentals() {
  const res = await fetch(`${BASE_URL}/store/rentals/items`, {
    headers: {
      "x-publishable-api-key": PUBLISHABLE_KEY,
    },
  });
  return res.json();
}
```
