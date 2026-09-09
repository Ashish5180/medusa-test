import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260909120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "rental_item" add column if not exists "max_rental_days" integer not null default 5;`
    )
    this.addSql(
      `alter table if exists "rental_booking" add column if not exists "cart_id" text null;`
    )
    this.addSql(
      `alter table if exists "rental_booking" add column if not exists "fee_line_item_id" text null;`
    )
    this.addSql(
      `alter table if exists "rental_booking" add column if not exists "deposit_line_item_id" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "rental_item" drop column if exists "max_rental_days";`)
    this.addSql(`alter table if exists "rental_booking" drop column if exists "cart_id";`)
    this.addSql(`alter table if exists "rental_booking" drop column if exists "fee_line_item_id";`)
    this.addSql(
      `alter table if exists "rental_booking" drop column if exists "deposit_line_item_id";`
    )
  }
}
