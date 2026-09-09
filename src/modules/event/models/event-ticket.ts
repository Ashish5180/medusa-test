import { model } from "@medusajs/framework/utils"

export const EventTicket = model.define("event_ticket", {
  id: model.id().primaryKey(),
  event_id: model.text(),
  order_id: model.text().nullable(),
  order_line_item_id: model.text().nullable(),
  ticket_code: model.text(),
  qr_payload: model.text().nullable(),
  ticket_tier: model.text().default("General Admission"),
  attendee_name: model.text().nullable(),
  attendee_email: model.text().nullable(),
  is_checked_in: model.boolean().default(false),
  checked_in_at: model.dateTime().nullable(),
  status: model.enum([
    "valid",
    "used",
    "cancelled",
  ]).default("valid"),
})

export default EventTicket
