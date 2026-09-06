import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EVENT_MODULE } from "../../../../modules/event"
import EventModuleService from "../../../../modules/event/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const eventService: EventModuleService = req.scope.resolve(EVENT_MODULE)
  const body = req.body as {
    ticketCode: string
  }

  if (!body.ticketCode) {
    res.status(400).json({
      message: "ticketCode is required.",
    })
    return
  }

  try {
    const result = await eventService.validateTicketCheckin(body.ticketCode)
    res.json(result)
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || "Ticket check-in failed",
    })
  }
}
