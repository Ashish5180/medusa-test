import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260909220000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "rental_item" add column if not exists "hourly_rate" integer not null default 0;`
    )
    this.addSql(
      `alter table if exists "rental_item" add column if not exists "rental_duration_type" text not null default 'daily';`
    )
    this.addSql(
      `alter table if exists "rental_item" add column if not exists "minimum_rental_period" integer not null default 1;`
    )
    this.addSql(
      `alter table if exists "rental_item" add column if not exists "late_fee_per_day" integer not null default 0;`
    )

    this.addSql(
      `alter table if exists "rental_booking" add column if not exists "late_fee" integer not null default 0;`
    )
    this.addSql(
      `alter table if exists "rental_booking" add column if not exists "return_status" text not null default 'pending';`
    )
    this.addSql(
      `alter table if exists "rental_booking" add column if not exists "variant_id" text null;`
    )
    this.addSql(
      `alter table if exists "rental_booking" add column if not exists "inventory_reservation_id" text null;`
    )
    this.addSql(
      `alter table if exists "rental_booking" add column if not exists "reminder_sent_at" timestamptz null;`
    )
    this.addSql(
      `alter table if exists "rental_booking" add column if not exists "overdue_notified_at" timestamptz null;`
    )

    this.addSql(
      `update "rental_booking" set "return_status" = 'pending' where "rental_status" = 'reserved';`
    )
    this.addSql(
      `update "rental_booking" set "return_status" = 'active' where "rental_status" = 'active';`
    )
    this.addSql(
      `update "rental_booking" set "return_status" = 'late' where "rental_status" = 'overdue';`
    )
    this.addSql(
      `update "rental_booking" set "return_status" = 'returned' where "rental_status" = 'returned';`
    )
    this.addSql(
      `update "rental_item" set "minimum_rental_period" = coalesce("min_rental_days", 1) where "minimum_rental_period" = 1;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "rental_item" drop column if exists "hourly_rate";`)
    this.addSql(`alter table if exists "rental_item" drop column if exists "rental_duration_type";`)
    this.addSql(`alter table if exists "rental_item" drop column if exists "minimum_rental_period";`)
    this.addSql(`alter table if exists "rental_item" drop column if exists "late_fee_per_day";`)
    this.addSql(`alter table if exists "rental_booking" drop column if exists "late_fee";`)
    this.addSql(`alter table if exists "rental_booking" drop column if exists "return_status";`)
    this.addSql(`alter table if exists "rental_booking" drop column if exists "variant_id";`)
    this.addSql(
      `alter table if exists "rental_booking" drop column if exists "inventory_reservation_id";`
    )
    this.addSql(`alter table if exists "rental_booking" drop column if exists "reminder_sent_at";`)
    this.addSql(`alter table if exists "rental_booking" drop column if exists "overdue_notified_at";`)
  }
}
