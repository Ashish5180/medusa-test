import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260909180002 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "service_slot" add column if not exists "vendor_id" text null;`
    )
    this.addSql(
      `alter table if exists "appointment_booking" add column if not exists "vendor_id" text null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "service_slot" drop column if exists "vendor_id";`)
    this.addSql(`alter table if exists "appointment_booking" drop column if exists "vendor_id";`)
  }
}
