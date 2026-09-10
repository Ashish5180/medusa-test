import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { fail, parseBody } from "../../../_helpers/http"
import { EVENT_MODULE } from "../../../../modules/event"
import EventModuleService from "../../../../modules/event/service"

const issueTicketSchema = z.object({
  eventId: z.string().min(1, "eventId is required"),
  attendeeName: z.string().min(1, "attendeeName is required"),
  attendeeEmail: z.string().email().optional().or(z.literal("")),
  ticketTier: z.string().optional(),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = parseBody(issueTicketSchema, req.body, res)
  if (!body) {
    return
  }

  const eventService: EventModuleService = req.scope.resolve(EVENT_MODULE)

  try {
    const ticket = await eventService.issueTicket(body.eventId, {
      attendee_name: body.attendeeName,
      attendee_email: body.attendeeEmail || undefined,
      ticket_tier: body.ticketTier || "General Admission",
    })

    res.json({ success: true, ticket })
  } catch (err) {
    fail(res, err, "Failed to issue ticket")
  }
}
