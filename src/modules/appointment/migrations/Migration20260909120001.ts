import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260909120001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "service_slot" add column if not exists "product_id" text null;`
    )
    this.addSql(
      `alter table if exists "appointment_booking" add column if not exists "cart_id" text null;`
    )
    this.addSql(
      `alter table if exists "appointment_booking" add column if not exists "line_item_id" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "service_slot" drop column if exists "product_id";`)
    this.addSql(`alter table if exists "appointment_booking" drop column if exists "cart_id";`)
    this.addSql(
      `alter table if exists "appointment_booking" drop column if exists "line_item_id";`
    )
  }
}
