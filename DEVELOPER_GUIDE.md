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
