import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260909200000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table if exists "vendor" add column if not exists "logo" text null;`)
    this.addSql(`alter table if exists "vendor" add column if not exists "email" text null;`)
    this.addSql(
      `alter table if exists "vendor" add column if not exists "commission_rate" integer not null default 15;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "vendor" drop column if exists "commission_rate";`)
    this.addSql(`alter table if exists "vendor" drop column if exists "email";`)
    this.addSql(`alter table if exists "vendor" drop column if exists "logo";`)
  }
}
