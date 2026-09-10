import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { fail, parseBody } from "../../_helpers/http"
import { ensureEventCatalogProduct } from "../../../lib/vertical-catalog"
import { EVENT_MODULE } from "../../../modules/event"
import EventModuleService from "../../../modules/event/service"

const createEventSchema = z.object({
  title: z.string().min(1, "title is required"),
  venue: z.string().min(1, "venue is required"),
  event_start: z.string().min(1, "event_start is required"),
  event_end: z.string().min(1, "event_end is required"),
  total_capacity: z.coerce.number().int().positive().optional(),
  description: z.string().optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const eventService: EventModuleService = req.scope.resolve(EVENT_MODULE)

  const events = await eventService.listEvents({}, { order: { created_at: "DESC" } })
  const tickets = await eventService.listEventTickets({}, { order: { created_at: "DESC" } })

  res.json({
    events,
    tickets,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = parseBody(createEventSchema, req.body, res)
  if (!body) {
    return
  }

  const eventService: EventModuleService = req.scope.resolve(EVENT_MODULE)

  try {
    const eventStart = new Date(body.event_start)
    const eventEnd = new Date(body.event_end)
    if (Number.isNaN(eventStart.getTime()) || Number.isNaN(eventEnd.getTime()) || eventEnd <= eventStart) {
      res.status(400).json({ message: "event_end must be after event_start." })
      return
    }

    const event = await eventService.createEvents({
      title: body.title,
      venue: body.venue,
      description: body.description || "",
      event_start: eventStart,
      event_end: eventEnd,
      total_capacity: body.total_capacity || 100,
      tickets_issued: 0,
      status: "published",
    })

    await ensureEventCatalogProduct(req.scope, event)

    res.json({ success: true, event })
  } catch (err) {
    fail(res, err, "Failed to create event")
  }
}
