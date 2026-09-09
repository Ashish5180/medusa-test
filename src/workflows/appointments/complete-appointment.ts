import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { centsToAmount } from "../../lib/commerce"
import { captureOrderAmount } from "../../lib/order-payment"
import { APPOINTMENT_MODULE } from "../../modules/appointment"
import AppointmentModuleService from "../../modules/appointment/service"

export type CompleteAppointmentInput = {
  bookingId: string
}

const completeAppointmentRecordStep = createStep(
  "complete-appointment-record",
  async (input: CompleteAppointmentInput, { container }) => {
    const appointmentService: AppointmentModuleService =
      container.resolve(APPOINTMENT_MODULE)
    const previous = await appointmentService.retrieveAppointmentBooking(input.bookingId)
    const booking = await appointmentService.completeAppointment(input.bookingId)
    return new StepResponse({ booking, previousStatus: previous.status }, {
      bookingId: input.bookingId,
      previousStatus: previous.status,
    })
  },
  async (compensate: { bookingId?: string; previousStatus?: string } | undefined, { container }) => {
    if (!compensate?.bookingId || !compensate.previousStatus) return
    const appointmentService: AppointmentModuleService =
      container.resolve(APPOINTMENT_MODULE)
    await appointmentService.updateAppointmentBookings({
      id: compensate.bookingId,
      status: compensate.previousStatus as "pending" | "confirmed" | "completed" | "cancelled" | "no_show",
    })
  }
)

const captureAppointmentPaymentStep = createStep(
  "capture-appointment-payment",
  async (booking: { order_id?: string | null; line_item_id?: string | null }, { container }) => {
    if (!booking.order_id) {
      return new StepResponse({ skipped: true })
    }

    const query = container.resolve("query") as {
      graph: (args: Record<string, unknown>) => Promise<{ data: any[] }>
    }
    let amount = 0
    if (booking.line_item_id) {
      const { data } = await query.graph({
        entity: "order",
        fields: ["id", "items.id", "items.unit_price", "items.quantity", "items.metadata"],
        filters: { id: booking.order_id },
      })
      const item = (data[0]?.items || []).find((entry: { id: string }) => entry.id === booking.line_item_id)
      if (item) {
        amount = Number(item.unit_price || 0) * Number(item.quantity || 1)
      } else if (data[0]?.items?.[0]?.metadata?.amount_cents) {
        amount = centsToAmount(Number(data[0].items[0].metadata.amount_cents))
      }
    }

    if (!amount) {
      return new StepResponse({ skipped: true, reason: "missing_line_amount" })
    }

    const result = await captureOrderAmount(container, booking.order_id, amount)
    return new StepResponse(result)
  }
)

export const completeAppointmentWorkflow = createWorkflow(
  "complete-appointment",
  (input: CompleteAppointmentInput) => {
    const record = completeAppointmentRecordStep(input)
    captureAppointmentPaymentStep(record.booking)
    return new WorkflowResponse(record.booking)
  }
)

export default completeAppointmentWorkflow
