# 🧠 Concept Learning Log

This log documents non-obvious architecture patterns, design choices, and tradeoffs implemented in this Medusa v2 multi-vertical codebase.

---

## 1. Modular Commerce Architecture vs. Monolithic Express API

### What Was Built
Instead of writing custom Express route handlers connected to ad-hoc database tables, we built **Rentals**, **Appointments**, and **Events** as **Medusa v2 Modules** (`src/modules/`), joined to Medusa's native catalog via **Remote Links** (`src/links/`).

### Why We Did It
- **Separation of Concerns:** Each module owns its own database tables (`rental_item`, `service_slot`, `event`), its own models (DML), and its own service class. Modules communicate via dependency injection and remote joins rather than tight foreign-key coupling.
- **Out-of-the-Box Commerce Primitives:** Building carts, multi-currency pricing, payment providers (Stripe), tax calculation, fulfillment, and customer account management manually in Express would require months of development. Medusa handles this out of the box.
- **Extensible Admin UI:** Medusa automatically renders an enterprise React dashboard. Adding new management tabs takes a single `page.tsx` with `defineRouteConfig`.

### Alternatives Considered
- **Plain Express.js + Prisma/Drizzle:** Complete freedom, but you must reinvent authentication, role-based access control, cart engines, order lifecycle state machines, and build a frontend admin panel from scratch.
- **Shopify / Third-Party SaaS:** Fast to start, but you cannot define custom database models or alter core checkout pipelines without severe platform restrictions and monthly app subscription fees.

---

## 2. Declarative Schemas with DML (Data Modeling Language)

### What Was Used
Medusa v2's `@medusajs/framework/utils` `model.define()`:
```typescript
export const RentalItem = model.define("rental_item", {
  id: model.id().primaryKey(),
  deposit_amount: model.number().default(0),
  daily_rate: model.number().default(0),
  min_rental_days: model.number().default(1),
  condition_grade: model.text().default("Excellent"),
  is_active: model.boolean().default(true),
})
```

### Core Concept
DML replaces boilerplate SQL and complex ORM mapping files. Medusa parses these model definitions and uses **MikroORM** under the hood to automatically generate database migrations (`npx medusa db:generate`).

### Why It Matters
When you want to customize or add fields (e.g. adding `cleaning_fee` or `zoom_url`), you only change 1 line in the model file and run migration generation.

---

## 3. Remote Links & Remote Queries (`query.graph`)

### What Was Used
Medusa v2 Remote Links (`defineLink`):
```typescript
export default defineLink(
  ProductModule.linkable.product,
  RentalModule.linkable.rentalItem
)
```

### Core Concept
In microservices or modular architectures, database foreign keys between independent modules are prohibited to maintain loose coupling. Medusa solves cross-module joins using **Link Tables** (e.g., `product_product_rentalmodule_rental_item`).

### Why It Matters
You can query across Products, Rental Rates, and Customer Orders in a single call using Medusa's GraphQL-like query engine:
```typescript
const { data } = await query.graph({
  entity: "product",
  fields: ["id", "title", "rental_item.*"],
})
```
No manual SQL joins or multiple HTTP round-trips needed.

---

## 4. Admin UI Extension via `defineRouteConfig`

### What Was Used
Medusa v2 Vite Admin file-based routing in `src/admin/routes/<name>/page.tsx`:
```typescript
export const config = defineRouteConfig({
  label: "Rentals",
  icon: Clock,
  rank: 10,
})
```

### Core Concept
Medusa v2's Admin Dashboard is a React Single-Page Application bundled with Vite. By placing a `page.tsx` in `src/admin/routes/` and exporting `config`, Medusa's admin bundler automatically injects the route, assigns it an icon and label in the left navigation sidebar, and handles session authentication without any routing boilerplate.

---

## 5. Non-Interactive Link Syncing in CI/CD (`--execute-all-links`)

### What Was Used
`medusa db:migrate --execute-all-links`

### Core Concept
In Medusa v2, when link definitions between modules change or are removed (for instance, migrating from `marketplace.vendor` to `vendorModuleService.vendor`), `medusa db:migrate` detects orphaned link tables and opens an interactive prompt asking which tables to drop. In unattended CI/CD and deployment environments (Railway, Docker, Render), no TTY/stdin exists, causing the process to hang indefinitely until a build timeout occurs. Passing `--execute-all-links` forces the Medusa CLI to apply all link table additions, updates, and removals automatically without interactive prompts.

