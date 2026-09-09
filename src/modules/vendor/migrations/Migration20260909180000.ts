import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260909180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "vendor" ("id" text not null, "name" text not null, "handle" text not null, "is_platform" boolean not null default false, "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vendor_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_vendor_deleted_at" ON "vendor" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_vendor_handle_unique" ON "vendor" ("handle") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "vendor_member" ("id" text not null, "vendor_id" text not null, "user_id" text not null, "role" text check ("role" in ('platform', 'owner', 'staff')) not null default 'owner', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vendor_member_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_vendor_member_deleted_at" ON "vendor_member" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_vendor_member_user_id" ON "vendor_member" ("user_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `alter table if exists "vendor" add column if not exists "is_platform" boolean not null default false;`
    )
    this.addSql(
      `alter table if exists "vendor" add column if not exists "is_active" boolean not null default true;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "vendor_member" cascade;`)
    this.addSql(`drop table if exists "vendor" cascade;`)
  }
}
