import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EVENT_MODULE } from "../../../modules/event"
import EventModuleService from "../../../modules/event/service"
import createEventWorkflow from "../../../workflows/events/create-event"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const eventService: EventModuleService = req.scope.resolve(EVENT_MODULE)
  const events = await eventService.listEvents({
    status: ["published", "sold_out"],
  })

  const withCapacity = await Promise.all(
    events.map(async (ev) => {
      const cap = await eventService.getEventRemainingCapacity(ev.id)
      return {
        ...ev,
        remainingCapacity: cap.remainingCapacity,
        isSoldOut: cap.isSoldOut,
      }
    })
  )

  res.json({
    events: withCapacity,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as {
    title: string
    description?: string
    venue: string
    eventStart: string
    eventEnd: string
    totalCapacity?: number
  }

  if (!body.title || !body.venue || !body.eventStart || !body.eventEnd) {
    res.status(400).json({
      message: "title, venue, eventStart, and eventEnd are required.",
    })
    return
  }

  try {
    const { result } = await createEventWorkflow(req.scope).run({
      input: body,
    })

    res.status(201).json({
      success: true,
      event: result,
    })
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || "Failed to create event",
    })
  }
}
