import { model } from "@medusajs/framework/utils"

export const RentalBooking = model.define("rental_booking", {
  id: model.id().primaryKey(),
  item_id: model.text(),
  order_id: model.text().nullable(),
  customer_id: model.text().nullable(),
  cart_id: model.text().nullable(),
  fee_line_item_id: model.text().nullable(),
  deposit_line_item_id: model.text().nullable(),
  start_date: model.dateTime(),
  end_date: model.dateTime(),
  total_rental_fee: model.number().default(0),
  deposit_amount: model.number().default(0),
  deposit_status: model.enum([
    "pending",
    "held",
    "refunded",
    "partially_refunded",
    "forfeited",
  ]).default("pending"),
  rental_status: model.enum([
    "reserved",
    "active",
    "returned",
    "overdue",
    "cancelled",
  ]).default("reserved"),
  condition_on_pickup: model.text().nullable(),
  condition_on_return: model.text().nullable(),
  damage_fee: model.number().default(0),
  late_fee: model.number().default(0),
  return_status: model.enum(["pending", "active", "returned", "late", "damaged"]).default("pending"),
  variant_id: model.text().nullable(),
  inventory_reservation_id: model.text().nullable(),
  reminder_sent_at: model.dateTime().nullable(),
  overdue_notified_at: model.dateTime().nullable(),
  notes: model.text().nullable(),
  vendor_id: model.text().nullable(),
})

export default RentalBooking
