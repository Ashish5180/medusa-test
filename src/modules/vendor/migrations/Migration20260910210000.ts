import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260910210000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "vendor" add column if not exists "description" text null;`)
    this.addSql(
      `alter table if exists "vendor" add column if not exists "status" text check ("status" in ('pending_approval', 'active', 'suspended')) not null default 'active';`
    )
    this.addSql(
      `create table if not exists "vendor_admin" ("id" text not null, "vendor_id" text not null, "user_id" text not null, "role" text check ("role" in ('platform', 'owner', 'admin', 'staff')) not null default 'owner', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vendor_admin_pkey" primary key ("id"));`
    )
    this.addSql(`alter table if exists "vendor_admin" add column if not exists "vendor_id" text null;`)
    this.addSql(`alter table if exists "vendor_admin" add column if not exists "user_id" text null;`)
    this.addSql(`alter table if exists "vendor_admin" add column if not exists "email" text null;`)
    this.addSql(`alter table if exists "vendor_admin" add column if not exists "first_name" text null;`)
    this.addSql(`alter table if exists "vendor_admin" add column if not exists "last_name" text null;`)
    this.addSql(`alter table if exists "vendor_admin" alter column "email" drop not null;`)
    this.addSql(`alter table if exists "vendor_admin" add column if not exists "role" text not null default 'owner';`)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_vendor_admin_deleted_at" ON "vendor_admin" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_vendor_admin_user_id" ON "vendor_admin" ("user_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "vendor_admin" cascade;`)
    this.addSql(`alter table if exists "vendor" drop column if exists "status";`)
    this.addSql(`alter table if exists "vendor" drop column if exists "description";`)
  }
}
