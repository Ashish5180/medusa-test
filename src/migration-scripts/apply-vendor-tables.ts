import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type PgConnection = {
  raw: (sql: string) => Promise<unknown>
}

export default async function applyVendorTables({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const pg: PgConnection = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  await pg.raw(`
    create table if not exists "vendor" (
      "id" text not null,
      "name" text not null,
      "handle" text not null,
      "is_platform" boolean not null default false,
      "is_active" boolean not null default true,
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "vendor_pkey" primary key ("id")
    );
  `)
  await pg.raw(
    `CREATE INDEX IF NOT EXISTS "IDX_vendor_deleted_at" ON "vendor" ("deleted_at") WHERE deleted_at IS NULL;`
  )
  await pg.raw(
    `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_vendor_handle_unique" ON "vendor" ("handle") WHERE deleted_at IS NULL;`
  )

  await pg.raw(`
    create table if not exists "vendor_member" (
      "id" text not null,
      "vendor_id" text not null,
      "user_id" text not null,
      "role" text check ("role" in ('platform', 'owner', 'staff')) not null default 'owner',
      "created_at" timestamptz not null default now(),
      "updated_at" timestamptz not null default now(),
      "deleted_at" timestamptz null,
      constraint "vendor_member_pkey" primary key ("id")
    );
  `)
  await pg.raw(
    `CREATE INDEX IF NOT EXISTS "IDX_vendor_member_deleted_at" ON "vendor_member" ("deleted_at") WHERE deleted_at IS NULL;`
  )
  await pg.raw(
    `CREATE INDEX IF NOT EXISTS "IDX_vendor_member_user_id" ON "vendor_member" ("user_id") WHERE deleted_at IS NULL;`
  )

  // Leftover marketplace `vendor` table already exists without these columns.
  await pg.raw(
    `alter table if exists "vendor" add column if not exists "is_platform" boolean not null default false;`
  )
  await pg.raw(
    `alter table if exists "vendor" add column if not exists "is_active" boolean not null default true;`
  )

  await pg.raw(`alter table if exists "rental_item" add column if not exists "vendor_id" text null;`)
  await pg.raw(`alter table if exists "rental_booking" add column if not exists "vendor_id" text null;`)
  await pg.raw(`alter table if exists "service_slot" add column if not exists "vendor_id" text null;`)
  await pg.raw(`alter table if exists "appointment_booking" add column if not exists "vendor_id" text null;`)

  logger.info("Vendor tables and vendor_id columns are ready.")
}
