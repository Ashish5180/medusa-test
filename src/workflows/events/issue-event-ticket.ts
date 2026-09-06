import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { EVENT_MODULE } from "../../modules/event"
import EventModuleService from "../../modules/event/service"

export type IssueEventTicketInput = {
  eventId: string
  ticketTier?: string
  attendeeName?: string
  attendeeEmail?: string
  orderId?: string
  orderLineItemId?: string
}

export const issueTicketStep = createStep(
  "issue-ticket",
  async (input: IssueEventTicketInput, { container }) => {
    const eventService: EventModuleService = container.resolve(EVENT_MODULE)

    const ticket = await eventService.issueTicket(input.eventId, {
      ticket_tier: input.ticketTier,
      attendee_name: input.attendeeName,
      attendee_email: input.attendeeEmail,
      order_id: input.orderId,
      order_line_item_id: input.orderLineItemId,
    })

    return new StepResponse(ticket, ticket.id)
  },
  async (ticketId: string | undefined, { container }) => {
    if (!ticketId) return
    const eventService: EventModuleService = container.resolve(EVENT_MODULE)
    await eventService.updateEventTickets({
      id: ticketId,
      status: "cancelled",
    })
  }
)

export const issueEventTicketWorkflow = createWorkflow(
  "issue-event-ticket",
  (input: IssueEventTicketInput) => {
    const ticket = issueTicketStep(input)
    return new WorkflowResponse(ticket)
  }
)

export default issueEventTicketWorkflow
