import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { isAppointmentLine, isRentalLine } from "../../lib/commerce"
import { APPOINTMENT_MODULE } from "../../modules/appointment"
import AppointmentModuleService from "../../modules/appointment/service"
import { RENTAL_MODULE } from "../../modules/rental"
import RentalModuleService from "../../modules/rental/service"

export type BindVerticalsToOrderInput = {
  orderId: string
  cartId?: string
  customerId?: string | null
  items: Array<{
    id: string
    metadata?: Record<string, unknown> | null
  }>
}

const bindVerticalsStep = createStep(
  "bind-vertical-bookings-to-order",
  async (input: BindVerticalsToOrderInput, { container }) => {
    const appointmentService: AppointmentModuleService =
      container.resolve(APPOINTMENT_MODULE)
    const rentalService: RentalModuleService = container.resolve(RENTAL_MODULE)

    const appointmentIds: string[] = []
    const rentalIds: string[] = []

    for (const item of input.items) {
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

    return new StepResponse({ appointmentIds, rentalIds })
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
