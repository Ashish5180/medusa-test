import { model } from "@medusajs/framework/utils"

export const RentalItem = model.define("rental_item", {
  id: model.id().primaryKey(),
  deposit_amount: model.number().default(0),
  daily_rate: model.number().default(0),
  hourly_rate: model.number().default(0),
  rental_duration_type: model.enum(["hourly", "daily"]).default("daily"),
  min_rental_days: model.number().default(1),
  max_rental_days: model.number().default(5),
  /** Alias of min period used by the official rentals recipe (days or hours). */
  minimum_rental_period: model.number().default(1),
  late_fee_per_day: model.number().default(0),
  condition_grade: model.text().default("Excellent"),
  is_active: model.boolean().default(true),
  vendor_id: model.text().nullable(),
})

export default RentalItem
