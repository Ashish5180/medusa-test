import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260909180001 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "rental_item" add column if not exists "vendor_id" text null;`)
    this.addSql(
      `alter table if exists "rental_booking" add column if not exists "vendor_id" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "rental_item" drop column if exists "vendor_id";`)
    this.addSql(`alter table if exists "rental_booking" drop column if exists "vendor_id";`)
  }
}
