import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { fail, parseBody } from "../../../_helpers/http"
import { EVENT_MODULE } from "../../../../modules/event"
import EventModuleService from "../../../../modules/event/service"

const updateEventSchema = z.object({
  title: z.string().optional(),
  venue: z.string().optional(),
  description: z.string().optional(),
  event_start: z.string().optional(),
  event_end: z.string().optional(),
  total_capacity: z.coerce.number().int().positive().optional(),
  status: z.enum(["draft", "published", "sold_out", "completed", "cancelled"]).optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const eventService: EventModuleService = req.scope.resolve(EVENT_MODULE)

  try {
    const event = await eventService.retrieveEvent(req.params.id)
    res.json({ event })
  } catch {
    res.status(404).json({ message: `Event ${req.params.id} not found.` })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = parseBody(updateEventSchema, req.body, res)
  if (!body) {
    return
  }

  const eventService: EventModuleService = req.scope.resolve(EVENT_MODULE)

  try {
    const event = await eventService.updateEvents({
      id: req.params.id,
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.venue !== undefined ? { venue: body.venue } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.event_start ? { event_start: new Date(body.event_start) } : {}),
      ...(body.event_end ? { event_end: new Date(body.event_end) } : {}),
      ...(body.total_capacity !== undefined ? { total_capacity: body.total_capacity } : {}),
      ...(body.status ? { status: body.status } : {}),
    })

    res.json({ success: true, event })
  } catch (err) {
    fail(res, err, "Failed to update event")
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const eventService: EventModuleService = req.scope.resolve(EVENT_MODULE)

  try {
    const tickets = await eventService.listEventTickets({ event_id: req.params.id })
    if (tickets.length) {
      await eventService.deleteEventTickets(tickets.map((ticket) => ticket.id))
    }
    await eventService.deleteEvents(req.params.id)
    res.json({ success: true, id: req.params.id, deleted: true })
  } catch (err) {
    fail(res, err, "Failed to delete event")
  }
}
