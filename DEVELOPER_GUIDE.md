# 📖 Medusa v2 Custom API Developer Guide

A complete, practical guide for backend developers on how to build, extend, and deploy custom REST APIs, database modules, and workflows in this Medusa v2 PERN backend.

---

## 📑 Table of Contents
1. [Routing Architecture & Folder Rules](#1-routing-architecture--folder-rules)
2. [Store vs. Admin APIs](#2-store-vs-admin-apis)
3. [How to Create a New API Route](#3-how-to-create-a-new-api-route)
4. [Handling Dynamic Route Parameters (`[id]`)](#4-handling-dynamic-route-parameters-id)
5. [Query Parameters & Filtering](#5-query-parameters--filtering)
6. [Request Body Validation (with Zod)](#6-request-body-validation-with-zod)
7. [Dependency Injection & Accessing Services](#7-dependency-injection--accessing-services)
8. [Creating a Transactional Workflow](#8-creating-a-transactional-workflow)
9. [Creating a Completely New Database Module](#9-creating-a-completely-new-database-module)
10. [Local Testing & Production Deployment](#10-local-testing--production-deployment)
11. [Cheat Sheet & Best Practices](#11-cheat-sheet--best-practices)
12. [Production-Grade Performance, Scalability & Efficiency Practices](#12-production-grade-performance-scalability--efficiency-practices)
13. [Pre-Production Checklist](#13-pre-production-checklist)

---

## 1. Routing Architecture & Folder Rules

Medusa v2 uses **file-based routing** located inside `src/api/`. You **never** need to configure Express routers manually.

- **Folder Path = URL Path**: The directory path under `src/api/` defines the endpoint URL.
- **File Name Must Be `route.ts`**: The handler file in any directory must be strictly named `route.ts`.
- **HTTP Methods as Named Exports**: Inside `route.ts`, export functions matching HTTP methods: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`.

```text
src/api/
├── store/
│   ├── rentals/
│   │   ├── items/
│   │   │   └── route.ts          # -> GET /store/rentals/items
│   │   └── book/
│   │       └── route.ts          # -> POST /store/rentals/book
│   └── custom-feature/
│       └── [id]/
│           └── route.ts          # -> GET /store/custom-feature/:id
└── admin/
    └── rentals/
        └── route.ts              # -> GET, POST /admin/rentals
```

---

## 2. Store vs. Admin APIs

Choose your folder path based on who will consume the API:

| Folder | URL Prefix | Auth Requirement | Typical Consumers |
| :--- | :--- | :--- | :--- |
| `src/api/store/*` | `/store/...` | Header: `x-publishable-api-key` | Mobile App, Public Storefront (Next.js, Flutter, React) |
| `src/api/admin/*` | `/admin/...` | Header: `Authorization: Bearer <TOKEN>` | Staff portal, admin scripts, internal automation, integrations |

---

## 3. How to Create a New API Route

### Example: Creating a "Feedback" API

Suppose you want to add a customer feedback feature: `GET /store/feedback` and `POST /store/feedback`.

#### Step 1: Create the directory & file
Create file: `src/api/store/feedback/route.ts`

#### Step 2: Implement the route handlers
```typescript
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// GET /store/feedback
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.json({
    feedbacks: [
      { id: "fb_1", rating: 5, comment: "Great rental service!" },
      { id: "fb_2", rating: 4, comment: "Smooth event check-in." }
    ]
  })
}

// POST /store/feedback
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as { rating: number; comment: string }

  if (!body.rating || !body.comment) {
    res.status(400).json({
      message: "Both rating and comment are required."
    })
    return
  }

  // Save or process feedback...
  res.status(201).json({
    success: true,
    message: "Thank you for your feedback!"
  })
}
```

That's it! As soon as you save the file, Medusa immediately serves:
- `GET https://your-domain.com/store/feedback`
- `POST https://your-domain.com/store/feedback`

---

## 4. Handling Dynamic Route Parameters (`[id]`)

To capture URL parameters (like `/store/rentals/:id` or `/store/events/:id/tickets`), use square brackets in the folder name:

#### Folder Structure:
`src/api/store/rentals/[id]/route.ts`

#### Implementation:
```typescript
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RENTAL_MODULE } from "../../../../modules/rental"
import RentalModuleService from "../../../../modules/rental/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  // Access dynamic parameter:
  const { id } = req.params

  const rentalService: RentalModuleService = req.scope.resolve(RENTAL_MODULE)
  
  try {
    const item = await rentalService.retrieveRentalItem(id)
    res.json({ item })
  } catch (error) {
    res.status(404).json({ message: `Rental item with id ${id} not found.` })
  }
}
```

---

## 5. Query Parameters & Filtering

Access query parameters (e.g. `?status=active&limit=10&page=1`) via `req.query`:

```typescript
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { status, limit, page } = req.query as {
    status?: string
    limit?: string
    page?: string
  }

  const take = Number(limit) || 20
  const skip = ((Number(page) || 1) - 1) * take

  // Query your module service with filters:
  res.json({
    filtersApplied: { status, take, skip }
  })
}
```

---

## 6. Request Body Validation (with Zod)

Medusa ships with `zod` installed. You can validate request payloads before processing:

```typescript
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"

const CreateBookingSchema = z.object({
  slot_id: z.string().min(1, "slot_id is required"),
  customer_name: z.string().min(2, "Name must be at least 2 characters"),
  customer_email: z.string().email("Invalid email address"),
  customer_phone: z.string().optional(),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const validation = CreateBookingSchema.safeParse(req.body)

  if (!validation.success) {
    res.status(400).json({
      errors: validation.error.format(),
    })
    return
  }

  const data = validation.data
  // Proceed with validated data safely...
  res.status(201).json({ success: true, booking: data })
}
```

---

## 7. Dependency Injection & Accessing Services

Medusa uses an inversion-of-control container. Inside any route handler, use `req.scope.resolve()` to inject:

### 1. Custom Domain Services
```typescript
import { RENTAL_MODULE } from "../../../modules/rental"
import { APPOINTMENT_MODULE } from "../../../modules/appointment"
import { EVENT_MODULE } from "../../../modules/event"

const rentalService = req.scope.resolve(RENTAL_MODULE)
const appointmentService = req.scope.resolve(APPOINTMENT_MODULE)
const eventService = req.scope.resolve(EVENT_MODULE)
```

### 2. Core Medusa Services & Remote Query
```typescript
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// Query graph (joins products, orders, customers across modules)
const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

const { data: products } = await query.graph({
  entity: "product",
  fields: ["id", "title", "thumbnail", "variants.*"],
})
```

---

## 8. Creating a Transactional Workflow

In Medusa v2, **business logic mutations should be executed through Workflows**. A workflow guarantees multi-step database safety: if step 3 fails, steps 1 and 2 are automatically rolled back.

### Example: Workflow in `src/workflows/feedback/submit-feedback.ts`
```typescript
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

export type FeedbackInput = {
  customer_name: string
  rating: number
  comment: string
}

// 1. Define Step with Compensation (Rollback)
export const saveFeedbackStep = createStep(
  "save-feedback",
  async (input: FeedbackInput, { container }) => {
    // Execute mutation
    const feedback = { id: `fb_${Date.now()}`, ...input }
    return new StepResponse(feedback, feedback.id)
  },
  async (feedbackId: string | undefined, { container }) => {
    // Rollback action if subsequent steps fail
    if (!feedbackId) return
    console.log(`Rollback: Deleting feedback ${feedbackId}`)
  }
)

// 2. Compose Workflow
export const submitFeedbackWorkflow = createWorkflow(
  "submit-feedback-workflow",
  (input: FeedbackInput) => {
    const feedback = saveFeedbackStep(input)
    return new WorkflowResponse(feedback)
  }
)

export default submitFeedbackWorkflow
```

### Triggering Workflow in an API Route:
```typescript
import submitFeedbackWorkflow from "../../../workflows/feedback/submit-feedback"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { result } = await submitFeedbackWorkflow(req.scope).run({
    input: req.body,
  })

  res.status(201).json({ feedback: result })
}
```

---

## 9. Creating a Completely New Database Module

If your new feature needs its own PostgreSQL tables, follow Medusa's 5-step module workflow:

### Step 1: Create Model
File: `src/modules/warranty/models/warranty-claim.ts`
```typescript
import { model } from "@medusajs/framework/utils"

export const WarrantyClaim = model.define("warranty_claim", {
  id: model.id().primaryKey(),
  order_id: model.text(),
  product_id: model.text(),
  issue_description: model.text(),
  status: model.enum(["pending", "approved", "rejected"]).default("pending"),
})

export default WarrantyClaim
```

### Step 2: Create Service
File: `src/modules/warranty/service.ts`
```typescript
import { MedusaService } from "@medusajs/framework/utils"
import WarrantyClaim from "./models/warranty-claim"

class WarrantyModuleService extends MedusaService({
  WarrantyClaim,
}) {}

export default WarrantyModuleService
```

### Step 3: Define Module Key
File: `src/modules/warranty/index.ts`
```typescript
import { Module } from "@medusajs/framework/utils"
import WarrantyModuleService from "./service"

export const WARRANTY_MODULE = "warrantyModuleService"

export default Module(WARRANTY_MODULE, {
  service: WarrantyModuleService,
})
```

### Step 4: Register in `medusa-config.ts`
Add the module path in `modules` array:
```typescript
  modules: [
    { resolve: "./src/modules/rental" },
    { resolve: "./src/modules/appointment" },
    { resolve: "./src/modules/event" },
    { resolve: "./src/modules/warranty" }, // <-- Your new module
  ],
```

### Step 5: Generate & Apply Migration
```bash
# 1. Generate migration script
npx medusa db:generate warrantyModuleService

# 2. Apply migration to PostgreSQL
npx medusa db:migrate
```

---

## 10. Local Testing & Production Deployment

### 1. Test Locally
```bash
# Start dev server (watches for changes)
npm run dev
```
Test using `curl`:
```bash
curl -s -H "x-publishable-api-key: pk_ad6038993d2bae4c3f6892c2063c1e741b1e5a3418cda0fca8e99592ae595ef8" \
  http://localhost:9000/store/rentals/items | jq .
```

### 2. Verify Code Before Push
```bash
# Check TypeScript types
npx tsc --noEmit

# Run Medusa linter
npm run lint

# Run build test
npm run build
```

### 3. Deploy to Production
```bash
git add .
git commit -m "feat: add warranty claims module and APIs"
git push origin main
```
- **GitHub Actions CI** automatically runs type checking and build verification.
- **Render** automatically pulls the commit, runs `npm run build:render` (auto-applying new DB migrations), performs a `/health` check, and switches traffic with **zero downtime**.

---

## 11. Cheat Sheet & Best Practices

1. **Always export HTTP methods as uppercase**: `export async function GET`, `POST`, `DELETE`.
2. **Never call mutation services directly in routes**: Use a Workflow (`someWorkflow(req.scope).run({ input })`) for any data creation/update/deletion. This satisfies Medusa's ESLint rules and guarantees atomic rollbacks.
3. **Public vs Protected**:
   - Routes under `/store/*` = Public storefront (Requires `x-publishable-api-key`).
   - Routes under `/admin/*` = Admin only (Requires `Authorization: Bearer <TOKEN>`).
4. **Dates in Medusa**: Always parse date strings into JavaScript `Date` objects (`new Date(body.start_date)`) before passing to module services.
5. **No frontend bloat**: Keep the backend pure API. All client UI lives in external Next.js, React, or Flutter frontends communicating over JSON.

---

## 12. Production-Grade Performance, Scalability & Efficiency Practices

Everything in Sections 1–11 makes your API *correct*. This section makes it *fast, cheap to run, and safe under load* — the difference between a POC and something that survives real traffic.

### 12.1 Bound Every Query — Never Return Unbounded Lists

An endpoint with no `limit` is an incident waiting to happen — one table growing to 500k rows turns a 50ms response into a multi-second one, and eventually an out-of-memory crash.

```typescript
// ❌ Bad — unbounded, O(n) memory and O(n log n) sort cost grows forever
const items = await rentalService.listRentalItems()

// ✅ Good — always cap limit, default it, and hard-cap the max
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { limit, offset } = req.query as { limit?: string; offset?: string }

  const take = Math.min(Number(limit) || 20, 100) // hard ceiling: never allow limit=100000
  const skip = Number(offset) || 0

  const [items, count] = await rentalService.listAndCountRentalItems(
    {},
    { take, skip }
  )

  res.json({ items, count, limit: take, offset: skip })
}
```

For tables that will grow into the millions (e.g. `Rental` bookings, `EventAttendee`), prefer **cursor-based pagination** over `offset` — offset pagination does `O(offset + limit)` work on the DB side (it has to scan and discard `offset` rows), while cursor pagination (`WHERE id > last_seen_id ORDER BY id LIMIT n`) is `O(limit)` regardless of how deep you page.

```typescript
// Cursor-based — cheap even on page 10,000
const { after, limit } = req.query as { after?: string; limit?: string }
const take = Math.min(Number(limit) || 20, 100)

const filters: any = {}
if (after) filters.id = { $gt: after }

const items = await rentalService.listRentalItems(filters, {
  take,
  order: { id: "ASC" },
})
```

### 12.2 Kill N+1 Queries — Batch with `query.graph()`

The single most common performance bug in Medusa apps: looping over a list and querying inside the loop.

```typescript
// ❌ Bad — N+1: 1 query for the list + N queries inside the loop = O(n) round-trips
const rentals = await rentalService.listRentalItems()
for (const rental of rentals) {
  const product = await productService.retrieveProduct(rental.product_id) // hits DB every iteration
}

// ✅ Good — one batched query using Query/Link, O(1) round-trips regardless of n
const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
const { data: rentals } = await query.graph({
  entity: "rental_item",
  fields: ["*", "product.*", "product.thumbnail"],
})
```

If you must fetch related data manually (no Link defined), batch the IDs first and do **one** `IN (...)` query instead of N single-row queries:

```typescript
const productIds = rentals.map((r) => r.product_id)
const { data: products } = await query.graph({
  entity: "product",
  fields: ["id", "title", "thumbnail"],
  filters: { id: productIds }, // single query, not a loop
})
const productMap = new Map(products.map((p) => [p.id, p])) // O(1) lookup below
```

### 12.3 Watch Your Own Time & Space Complexity, Not Just the DB's

Once data is in memory, sloppy JS can dominate your response time more than the query did.

```typescript
// ❌ Bad — nested loop = O(n * m). With 1,000 rentals and 1,000 products, that's 1,000,000 comparisons.
const enriched = rentals.map((rental) => {
  const product = products.find((p) => p.id === rental.product_id) // O(m) per rental
  return { ...rental, product }
})

// ✅ Good — build a Map once (O(m)), then O(1) lookup per rental → total O(n + m)
const productMap = new Map(products.map((p) => [p.id, p]))
const enriched = rentals.map((rental) => ({
  ...rental,
  product: productMap.get(rental.product_id),
}))
```

Space complexity matters too — don't hold full result sets in memory just to compute a count or a single aggregate:

```typescript
// ❌ Bad — loads every row into memory just to count them, O(n) space for a number
const all = await rentalService.listRentalItems()
const total = all.length

// ✅ Good — let the database count, O(1) space on your side
const [, total] = await rentalService.listAndCountRentalItems({}, { take: 0 })
```

### 12.4 Cache What's Expensive and Doesn't Change Every Second

Product catalogs, tax regions, shipping options — these change far less often than they're read. Use Redis (already provisioned, see the Cloud infra section) as a cache-aside layer.

```typescript
import { Modules } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cacheKey = `store:products:region:${req.query.region_id}`
  const cacheService = req.scope.resolve("cacheService") // or a direct ioredis client

  const cached = await cacheService.get(cacheKey)
  if (cached) {
    res.json(JSON.parse(cached))
    return
  }

  const products = await fetchProductsFromDb(req)
  await cacheService.set(cacheKey, JSON.stringify(products), 60) // TTL: 60s

  res.json(products)
}
```

**Invalidation rule of thumb**: any workflow that mutates a resource should delete/refresh its cache key(s) in the same step (or the next tick), not rely on TTL alone if staleness would confuse a customer (e.g. price changes).

### 12.5 Make Mutating Endpoints Idempotent

Mobile networks retry failed requests. Without idempotency, a flaky connection can create the same rental booking twice.

```typescript
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const idempotencyKey = req.headers["idempotency-key"] as string | undefined

  if (idempotencyKey) {
    const existing = await idempotencyService.find(idempotencyKey)
    if (existing) {
      res.status(existing.status_code).json(existing.response_body)
      return
    }
  }

  const { result } = await submitBookingWorkflow(req.scope).run({ input: req.body })

  if (idempotencyKey) {
    await idempotencyService.save(idempotencyKey, 201, { booking: result })
  }

  res.status(201).json({ booking: result })
}
```

RN app side: generate a UUID once per user action (e.g. once per "tap Book Now"), send it as `Idempotency-Key`, and reuse the *same* UUID if you retry the same request.

### 12.6 Rate Limit — Protect the DB from Your Own Traffic Spikes

A single misbehaving client (or a bug in the RN app that retries in a tight loop) can take down shared Postgres/Redis for everyone.

```typescript
// src/api/middlewares.ts
import { defineMiddlewares } from "@medusajs/framework/http"
import rateLimit from "express-rate-limit"

const bookingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,             // 20 requests per IP per minute
  message: { message: "Too many requests, slow down." },
})

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/rentals/book",
      method: "POST",
      middlewares: [bookingLimiter],
    },
  ],
})
```

### 12.7 Don't Block the Request-Response Cycle on Heavy Work

If an endpoint sends an email, generates a PDF invoice, or calls a slow third-party API, don't make the customer wait for it.

```typescript
// ❌ Bad — customer's HTTP request stays open until the email provider responds
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { result } = await createBookingWorkflow(req.scope).run({ input: req.body })
  await emailService.send(result.customer_email, "Booking confirmed") // adds 500ms-2s
  res.status(201).json({ booking: result })
}

// ✅ Good — respond immediately, emit an event, let a subscriber handle it async
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { result } = await createBookingWorkflow(req.scope).run({ input: req.body })
  res.status(201).json({ booking: result }) // fast response, ~O(1) extra latency
}

// src/subscribers/booking-created.ts — runs after the response is already sent
export default async function bookingCreatedHandler({ event, container }) {
  const emailService = container.resolve("emailService")
  await emailService.send(event.data.customer_email, "Booking confirmed")
}
export const config = { event: "booking.created" }
```

### 12.8 Index What You Filter and Sort By

Every `filters: { status: "active" }` or `order: { created_at: "DESC" }` in your service methods needs a matching database index, or Postgres will do a full table scan (`O(n)`) instead of an index lookup (`O(log n)`).

```typescript
// src/modules/rental/models/rental-booking.ts
import { model } from "@medusajs/framework/utils"

export const RentalBooking = model.define("rental_booking", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  status: model.enum(["pending", "confirmed", "returned", "cancelled"]),
  start_date: model.dateTime(),
}).indexes([
  { on: ["status"] },
  { on: ["customer_id", "start_date"] }, // composite index for your most common filter combo
])
```

Run `EXPLAIN ANALYZE` on your slowest queries in the Neon/Postgres console before production — "Seq Scan" in the output on a large table is your signal to add an index.

### 12.9 Design Stateless — Cloud Will Run Multiple Instances

Once traffic grows, Medusa Cloud (or Railway/Render) will horizontally scale your app to multiple instances behind a load balancer. Anything stored in a route handler's local memory (an in-process cache, a `Map` of pending requests, a counter variable) will be **inconsistent across instances** — instance A won't see what instance B wrote.

```typescript
// ❌ Bad — breaks the moment you run 2+ instances; each has its own copy
const pendingBookings = new Map<string, any>()

// ✅ Good — shared state lives in Redis or Postgres, visible to every instance
await redisClient.set(`pending:${bookingId}`, JSON.stringify(data), "EX", 300)
```

### 12.10 Consistent, Structured Error Responses

Don't leak stack traces to the client, and don't let every route invent its own error shape — makes the RN app's error handling unpredictable.

```typescript
// src/api/middlewares.ts — a global error shape
export function errorHandler(err: any, req: MedusaRequest, res: MedusaResponse, next: any) {
  const status = err.status || 500
  res.status(status).json({
    error: {
      code: err.code || "INTERNAL_ERROR",
      message: status >= 500 ? "Something went wrong. Please try again." : err.message,
    },
  })
  // Log the real error server-side, never send it to the client
  console.error(err)
}
```

### 12.11 Observability — You Can't Fix What You Can't See

Minimum viable production setup:

- **Health check**: keep `/health` cheap (no DB call) so load balancers don't false-positive under DB slowness — or add a separate `/health/deep` that does check DB/Redis for your own monitoring.
- **Structured logs**: log `{ route, duration_ms, status_code }` per request, not free-text strings — makes it queryable later.
- **Slow query log**: log any DB call over e.g. 500ms with its filters, so you know exactly which endpoint to optimize next.

### 12.12 Compress Large Responses

```typescript
// medusa-config.ts or your Express layer
import compression from "compression"
app.use(compression()) // gzip/brotli — cuts a 200KB product-list JSON to ~30KB over the wire
```

Matters a lot for mobile clients on 4G/patchy networks — smaller payload = faster perceived load in the RN app.

---

## 13. Pre-Production Checklist

| Check | Why |
|---|---|
| Every list endpoint has `limit`/`offset` (or cursor) with a hard max | Prevents unbounded queries |
| No loops calling the DB per iteration | Prevents N+1, O(n) round-trips |
| Indexes exist on every filtered/sorted column | Prevents full table scans |
| Mutating endpoints accept `Idempotency-Key` | Prevents duplicate bookings/orders from retries |
| Rate limiting on write endpoints | Prevents abuse and DB overload |
| No `new Map()`/local variables used as cross-request state | Required for horizontal scaling |
| Heavy work (email, PDF, webhooks) moved to subscribers/jobs | Keeps response times low |
| Load-tested with realistic concurrency (k6/artillery) before launch | Confirms it holds up before real users find out |
| `EXPLAIN ANALYZE` run on the 5 slowest known queries | Confirms indexes are actually being used |
| Errors return a consistent `{ error: { code, message } }` shape, never a raw stack trace | Predictable client-side handling, no leaked internals |

