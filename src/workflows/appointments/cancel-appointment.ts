import { MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { APPOINTMENT_FREE_CANCEL_HOURS, hoursUntil } from "../../lib/commerce"
import { orderHasCapturedPayment, voidOrderPayment } from "../../lib/order-payment"
import { APPOINTMENT_MODULE } from "../../modules/appointment"
import AppointmentModuleService from "../../modules/appointment/service"
import { RENTAL_MODULE } from "../../modules/rental"
import RentalModuleService from "../../modules/rental/service"

export type CancelAppointmentInput = {
  bookingId: string
  force?: boolean
}

const validateAndCancelAppointmentStep = createStep(
  "validate-and-cancel-appointment",
  async (input: CancelAppointmentInput, { container }) => {
    const appointmentService: AppointmentModuleService =
      container.resolve(APPOINTMENT_MODULE)
    const booking = await appointmentService.retrieveAppointmentBooking(input.bookingId)
    const slot = await appointmentService.retrieveServiceSlot(booking.slot_id)

    if (!input.force && booking.status !== "pending") {
      const hours = hoursUntil(new Date(slot.slot_start))
      if (hours < APPOINTMENT_FREE_CANCEL_HOURS && booking.order_id) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          `Free cancellation closes ${APPOINTMENT_FREE_CANCEL_HOURS} hours before the slot. Use staff force-cancel if you still need to void this order.`
        )
      }
    }

    if (booking.order_id && (await orderHasCapturedPayment(container, booking.order_id))) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "This order already has a captured payment. V1 only voids the full order before any capture."
      )
    }

    const cancelled = await appointmentService.cancelAppointment(input.bookingId)
    const siblingIds: string[] = []

    if (booking.order_id) {
      const siblings = await appointmentService.listAppointmentBookings({
        order_id: booking.order_id,
        status: ["pending", "confirmed"],
      })
      for (const sibling of siblings) {
        if (sibling.id === booking.id) continue
        await appointmentService.cancelAppointment(sibling.id)
        siblingIds.push(sibling.id)
      }

      const rentalService: RentalModuleService = container.resolve(RENTAL_MODULE)
      const rentals = await rentalService.listRentalBookings({
        order_id: booking.order_id,
        rental_status: ["reserved", "active"],
      })
      for (const rental of rentals) {
        await rentalService.cancelRental(rental.id)
        siblingIds.push(rental.id)
      }

      await voidOrderPayment(container, booking.order_id)
    }

    return new StepResponse({ booking: cancelled, siblingIds })
  }
)

export const cancelAppointmentWorkflow = createWorkflow(
  "cancel-appointment",
  (input: CancelAppointmentInput) => {
    const result = validateAndCancelAppointmentStep(input)
    return new WorkflowResponse(result)
  }
)

export default cancelAppointmentWorkflow
