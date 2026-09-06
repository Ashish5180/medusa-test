import { model } from "@medusajs/framework/utils"

export const ServiceSlot = model.define("service_slot", {
  id: model.id().primaryKey(),
  service_id: model.text(),
  resource_id: model.text().nullable(),
  resource_name: model.text().default("General Staff"),
  slot_start: model.dateTime(),
  slot_end: model.dateTime(),
  max_capacity: model.number().default(1),
  booked_count: model.number().default(0),
  is_blocked: model.boolean().default(false),
})

export default ServiceSlot
