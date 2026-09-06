import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EVENT_MODULE } from "../../../../modules/event"
import EventModuleService from "../../../../modules/event/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const eventService: EventModuleService = req.scope.resolve(EVENT_MODULE)
  const body = req.body as {
    eventId: string
    attendeeName: string
    attendeeEmail?: string
    ticketTier?: string
  }

  if (!body.eventId || !body.attendeeName) {
    res.status(400).json({ message: "eventId and attendeeName are required." })
    return
  }

  try {
    const ticket = await eventService.issueTicket(body.eventId, {
      attendee_name: body.attendeeName,
      attendee_email: body.attendeeEmail,
      ticket_tier: body.ticketTier || "General Admission",
    })

    res.json({ success: true, ticket })
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || "Failed to issue ticket" })
  }
}
