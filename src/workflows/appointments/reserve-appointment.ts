import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { APPOINTMENT_MODULE } from "../../modules/appointment"
import AppointmentModuleService from "../../modules/appointment/service"

export type ReserveAppointmentInput = {
  slotId: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  orderId?: string
  customerId?: string
  cartId?: string
  lineItemId?: string
  notes?: string
  status?: "pending" | "confirmed"
}

export const reserveAppointmentSlotStep = createStep(
  "reserve-appointment-slot",
  async (input: ReserveAppointmentInput, { container }) => {
    const appointmentService: AppointmentModuleService =
      container.resolve(APPOINTMENT_MODULE)

    const booking = await appointmentService.reserveSlot(input.slotId, {
      order_id: input.orderId,
      customer_id: input.customerId,
      cart_id: input.cartId,
      line_item_id: input.lineItemId,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
      notes: input.notes,
      status: input.status || "pending",
    })

    return new StepResponse(booking, booking.id)
  },
  async (bookingId: string | undefined, { container }) => {
    if (!bookingId) return
    const appointmentService: AppointmentModuleService =
      container.resolve(APPOINTMENT_MODULE)
    await appointmentService.cancelAppointment(bookingId)
  }
)

export const reserveAppointmentWorkflow = createWorkflow(
  "reserve-appointment",
  (input: ReserveAppointmentInput) => {
    const booking = reserveAppointmentSlotStep(input)
    return new WorkflowResponse(booking)
  }
)

export default reserveAppointmentWorkflow
