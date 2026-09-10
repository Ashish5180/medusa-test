import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { fail, parseBody } from "../../../../_helpers/http"
import { EVENT_MODULE } from "../../../../../modules/event"
import EventModuleService from "../../../../../modules/event/service"

const updateTicketSchema = z.object({
  attendee_name: z.string().optional(),
  attendee_email: z.string().email().optional().or(z.literal("")),
  ticket_tier: z.string().optional(),
  status: z.enum(["valid", "used", "cancelled"]).optional(),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = parseBody(updateTicketSchema, req.body, res)
  if (!body) {
    return
  }

  const eventService: EventModuleService = req.scope.resolve(EVENT_MODULE)

  try {
    if (body.status === "cancelled") {
      const ticket = await eventService.cancelTicket(req.params.id)
      res.json({ success: true, ticket })
      return
    }

    const ticket = await eventService.updateEventTickets({
      id: req.params.id,
      ...(body.attendee_name !== undefined ? { attendee_name: body.attendee_name } : {}),
      ...(body.attendee_email !== undefined
        ? { attendee_email: body.attendee_email || undefined }
        : {}),
      ...(body.ticket_tier !== undefined ? { ticket_tier: body.ticket_tier } : {}),
      ...(body.status ? { status: body.status } : {}),
    })

    res.json({ success: true, ticket })
  } catch (err) {
    fail(res, err, "Failed to update ticket")
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const eventService: EventModuleService = req.scope.resolve(EVENT_MODULE)

  try {
    await eventService.cancelTicket(req.params.id)
    await eventService.deleteEventTickets(req.params.id)
    res.json({ success: true, id: req.params.id, deleted: true })
  } catch (err) {
    fail(res, err, "Failed to delete ticket")
  }
}
