import { model } from "@medusajs/framework/utils"

export const AppointmentBooking = model.define("appointment_booking", {
  id: model.id().primaryKey(),
  slot_id: model.text(),
  order_id: model.text().nullable(),
  customer_id: model.text().nullable(),
  cart_id: model.text().nullable(),
  line_item_id: model.text().nullable(),
  customer_name: model.text().nullable(),
  customer_email: model.text().nullable(),
  customer_phone: model.text().nullable(),
  status: model.enum([
    "pending",
    "confirmed",
    "completed",
    "cancelled",
    "no_show",
  ]).default("pending"),
  notes: model.text().nullable(),
})

export default AppointmentBooking
