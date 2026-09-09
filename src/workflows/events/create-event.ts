import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ensureEventCatalogProduct } from "../../lib/vertical-catalog"
import { EVENT_MODULE } from "../../modules/event"
import EventModuleService from "../../modules/event/service"

export type CreateEventInput = {
  title: string
  description?: string
  venue: string
  eventStart: string
  eventEnd: string
  totalCapacity?: number
}

export const createEventStep = createStep(
  "create-event",
  async (input: CreateEventInput, { container }) => {
    const eventService: EventModuleService = container.resolve(EVENT_MODULE)

    const event = await eventService.createEvents({
      title: input.title,
      description: input.description,
      venue: input.venue,
      event_start: new Date(input.eventStart),
      event_end: new Date(input.eventEnd),
      total_capacity: input.totalCapacity || 100,
      tickets_issued: 0,
      status: "published",
    })

    await ensureEventCatalogProduct(container, event)

    return new StepResponse(event, event.id)
  },
  async (eventId: string | undefined, { container }) => {
    if (!eventId) return
    const eventService: EventModuleService = container.resolve(EVENT_MODULE)
    await eventService.deleteEvents([eventId])
  }
)

export const createEventWorkflow = createWorkflow(
  "create-event",
  (input: CreateEventInput) => {
    const event = createEventStep(input)
    return new WorkflowResponse(event)
  }
)

export default createEventWorkflow
