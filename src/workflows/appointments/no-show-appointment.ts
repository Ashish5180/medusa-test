import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { captureOrderAmount } from "../../lib/order-payment"
import { APPOINTMENT_MODULE } from "../../modules/appointment"
import AppointmentModuleService from "../../modules/appointment/service"

export type NoShowAppointmentInput = {
  bookingId: string
}

const markNoShowStep = createStep(
  "mark-appointment-no-show",
  async (input: NoShowAppointmentInput, { container }) => {
    const appointmentService: AppointmentModuleService =
      container.resolve(APPOINTMENT_MODULE)
    const previous = await appointmentService.retrieveAppointmentBooking(input.bookingId)
    const booking = await appointmentService.markNoShow(input.bookingId)
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

const captureNoShowPaymentStep = createStep(
  "capture-appointment-no-show-payment",
  async (booking: { order_id?: string | null; line_item_id?: string | null }, { container }) => {
    if (!booking.order_id) {
      return new StepResponse({ skipped: true })
    }

    const query = container.resolve("query") as {
      graph: (args: Record<string, unknown>) => Promise<{ data: any[] }>
    }
    const { data } = await query.graph({
      entity: "order",
      fields: ["id", "items.id", "items.unit_price", "items.quantity"],
      filters: { id: booking.order_id },
    })
    const item = (data[0]?.items || []).find((entry: { id: string }) => entry.id === booking.line_item_id)
    const amount = item
      ? Number(item.unit_price || 0) * Number(item.quantity || 1)
      : 0

    if (!amount) {
      return new StepResponse({ skipped: true, reason: "missing_line_amount" })
    }

    return new StepResponse(await captureOrderAmount(container, booking.order_id, amount))
  }
)

export const noShowAppointmentWorkflow = createWorkflow(
  "no-show-appointment",
  (input: NoShowAppointmentInput) => {
    const record = markNoShowStep(input)
    captureNoShowPaymentStep(record.booking)
    return new WorkflowResponse(record.booking)
  }
)

export default noShowAppointmentWorkflow
