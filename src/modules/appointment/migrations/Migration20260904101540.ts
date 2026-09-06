import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260904101540 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "appointment_booking" ("id" text not null, "slot_id" text not null, "order_id" text null, "customer_id" text null, "customer_name" text null, "customer_email" text null, "customer_phone" text null, "status" text check ("status" in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')) not null default 'pending', "notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "appointment_booking_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_appointment_booking_deleted_at" ON "appointment_booking" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "service_slot" ("id" text not null, "service_id" text not null, "resource_id" text null, "resource_name" text not null default 'General Staff', "slot_start" timestamptz not null, "slot_end" timestamptz not null, "max_capacity" integer not null default 1, "booked_count" integer not null default 0, "is_blocked" boolean not null default false, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "service_slot_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_service_slot_deleted_at" ON "service_slot" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "appointment_booking" cascade;`);

    this.addSql(`drop table if exists "service_slot" cascade;`);
  }

}
