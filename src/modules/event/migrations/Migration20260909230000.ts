import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260909230000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "event_ticket" add column if not exists "qr_payload" text null;`
    )
    this.addSql(
      `update "event_ticket" set "qr_payload" = "ticket_code" where "qr_payload" is null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "event_ticket" drop column if exists "qr_payload";`)
  }
}
