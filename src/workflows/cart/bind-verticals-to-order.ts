import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { isAppointmentLine, isEventLine, isRentalLine } from "../../lib/commerce"
import { APPOINTMENT_MODULE } from "../../modules/appointment"
import AppointmentModuleService from "../../modules/appointment/service"
import { EVENT_MODULE } from "../../modules/event"
import EventModuleService from "../../modules/event/service"
import { RENTAL_MODULE } from "../../modules/rental"
import RentalModuleService from "../../modules/rental/service"

export type BindVerticalsToOrderInput = {
  orderId: string
  cartId?: string
  customerId?: string | null
  items: Array<{
    id: string
    quantity?: number
    metadata?: Record<string, unknown> | null
  }>
}

const bindVerticalsStep = createStep(
  "bind-vertical-bookings-to-order",
  async (input: BindVerticalsToOrderInput, { container }) => {
    const appointmentService: AppointmentModuleService =
      container.resolve(APPOINTMENT_MODULE)
    const rentalService: RentalModuleService = container.resolve(RENTAL_MODULE)
    const eventService: EventModuleService = container.resolve(EVENT_MODULE)

    const appointmentIds: string[] = []
    const rentalIds: string[] = []
    const ticketIds: string[] = []

    for (const item of input.items) {
      if (isEventLine(item.metadata) && typeof item.metadata?.event_id === "string") {
        const quantity = Math.max(1, Number(item.quantity || 1))
        const existing = await eventService.listEventTickets({
          order_line_item_id: item.id,
        })
        for (const ticket of existing) {
          ticketIds.push(ticket.id)
        }
        for (let issued = existing.length; issued < quantity; issued++) {
          const ticket = await eventService.issueTicket(String(item.metadata.event_id), {
            order_id: input.orderId,
            order_line_item_id: item.id,
            ticket_tier: String(item.metadata.ticket_type || "General Admission"),
            attendee_name: item.metadata.attendee_name
              ? String(item.metadata.attendee_name)
              : undefined,
            attendee_email: item.metadata.attendee_email
              ? String(item.metadata.attendee_email)
              : undefined,
          })
          ticketIds.push(ticket.id)
        }
        continue
      }

      const bookingId = item.metadata?.booking_id
      if (typeof bookingId !== "string") continue

      if (isAppointmentLine(item.metadata)) {
        const existing = await appointmentService.retrieveAppointmentBooking(bookingId)
        if (existing.order_id === input.orderId) {
          appointmentIds.push(bookingId)
          continue
        }
        await appointmentService.confirmAppointment(bookingId, {
          order_id: input.orderId,
          customer_id: input.customerId || existing.customer_id || undefined,
        })
        await appointmentService.updateAppointmentBookings({
          id: bookingId,
          line_item_id: item.id,
        })
        appointmentIds.push(bookingId)
      }

      if (isRentalLine(item.metadata) && item.metadata?.kind === "fee") {
        const existing = await rentalService.retrieveRentalBooking(bookingId)
        if (existing.order_id === input.orderId) {
          rentalIds.push(bookingId)
          continue
        }
        await rentalService.updateRentalBookings({
          id: bookingId,
          order_id: input.orderId,
          customer_id: input.customerId || existing.customer_id,
          deposit_status: "held",
          fee_line_item_id: item.id,
        })
        rentalIds.push(bookingId)
      }
    }

    return new StepResponse({ appointmentIds, rentalIds, ticketIds })
  }
)

export const bindVerticalsToOrderWorkflow = createWorkflow(
  "bind-verticals-to-order",
  (input: BindVerticalsToOrderInput) => {
    const result = bindVerticalsStep(input)
    return new WorkflowResponse(result)
  }
)

export default bindVerticalsToOrderWorkflow
