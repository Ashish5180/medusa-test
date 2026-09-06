import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260904101542 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "event" ("id" text not null, "title" text not null, "description" text null, "venue" text not null, "event_start" timestamptz not null, "event_end" timestamptz not null, "total_capacity" integer not null default 100, "tickets_issued" integer not null default 0, "status" text check ("status" in ('draft', 'published', 'sold_out', 'completed', 'cancelled')) not null default 'published', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "event_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_event_deleted_at" ON "event" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "event_ticket" ("id" text not null, "event_id" text not null, "order_id" text null, "order_line_item_id" text null, "ticket_code" text not null, "ticket_tier" text not null default 'General Admission', "attendee_name" text null, "attendee_email" text null, "is_checked_in" boolean not null default false, "checked_in_at" timestamptz null, "status" text check ("status" in ('valid', 'used', 'cancelled')) not null default 'valid', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "event_ticket_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_event_ticket_deleted_at" ON "event_ticket" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "event" cascade;`);

    this.addSql(`drop table if exists "event_ticket" cascade;`);
  }

}
