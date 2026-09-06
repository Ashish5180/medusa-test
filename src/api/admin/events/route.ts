import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EVENT_MODULE } from "../../../modules/event"
import EventModuleService from "../../../modules/event/service"

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
  const eventService: EventModuleService = req.scope.resolve(EVENT_MODULE)
  const body = req.body as {
    title: string
    venue: string
    event_start: string
    event_end: string
    total_capacity: number
    description?: string
  }

  if (!body.title || !body.venue || !body.event_start || !body.event_end) {
    res.status(400).json({ message: "title, venue, event_start, and event_end are required." })
    return
  }

  try {
    const event = await eventService.createEvents({
      title: body.title,
      venue: body.venue,
      description: body.description || "",
      event_start: new Date(body.event_start),
      event_end: new Date(body.event_end),
      total_capacity: Number(body.total_capacity) || 100,
      tickets_issued: 0,
      status: "published",
    })

    res.json({ success: true, event })
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || "Failed to create event" })
  }
}
