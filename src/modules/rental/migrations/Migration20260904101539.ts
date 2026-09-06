import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260904101539 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "rental_booking" ("id" text not null, "item_id" text not null, "order_id" text null, "customer_id" text null, "start_date" timestamptz not null, "end_date" timestamptz not null, "total_rental_fee" integer not null default 0, "deposit_amount" integer not null default 0, "deposit_status" text check ("deposit_status" in ('pending', 'held', 'refunded', 'partially_refunded', 'forfeited')) not null default 'pending', "rental_status" text check ("rental_status" in ('reserved', 'active', 'returned', 'overdue', 'cancelled')) not null default 'reserved', "condition_on_pickup" text null, "condition_on_return" text null, "damage_fee" integer not null default 0, "notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "rental_booking_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_rental_booking_deleted_at" ON "rental_booking" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "rental_item" ("id" text not null, "deposit_amount" integer not null default 0, "daily_rate" integer not null default 0, "min_rental_days" integer not null default 1, "condition_grade" text not null default 'Excellent', "is_active" boolean not null default true, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "rental_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_rental_item_deleted_at" ON "rental_item" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "rental_booking" cascade;`);

    this.addSql(`drop table if exists "rental_item" cascade;`);
  }

}
