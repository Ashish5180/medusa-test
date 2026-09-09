import { model } from "@medusajs/framework/utils"

export const RentalItem = model.define("rental_item", {
  id: model.id().primaryKey(),
  deposit_amount: model.number().default(0),
  daily_rate: model.number().default(0),
  min_rental_days: model.number().default(1),
  max_rental_days: model.number().default(5),
  condition_grade: model.text().default("Excellent"),
  is_active: model.boolean().default(true),
})

export default RentalItem
