import { model } from "@medusajs/framework/utils"

export const Event = model.define("event", {
  id: model.id().primaryKey(),
  title: model.text(),
  description: model.text().nullable(),
  venue: model.text(),
  event_start: model.dateTime(),
  event_end: model.dateTime(),
  total_capacity: model.number().default(100),
  tickets_issued: model.number().default(0),
  status: model.enum([
    "draft",
    "published",
    "sold_out",
    "completed",
    "cancelled",
  ]).default("published"),
})

export default Event
