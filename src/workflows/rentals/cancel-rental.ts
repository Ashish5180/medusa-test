import { MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { orderHasCapturedPayment, voidOrderPayment } from "../../lib/order-payment"
import { APPOINTMENT_MODULE } from "../../modules/appointment"
import AppointmentModuleService from "../../modules/appointment/service"
import { RENTAL_MODULE } from "../../modules/rental"
import RentalModuleService from "../../modules/rental/service"

export type CancelRentalInput = {
  bookingId: string
}

const cancelRentalAndOrderStep = createStep(
  "cancel-rental-and-open-order",
  async (input: CancelRentalInput, { container }) => {
    const rentalService: RentalModuleService = container.resolve(RENTAL_MODULE)
    const booking = await rentalService.retrieveRentalBooking(input.bookingId)

    if (booking.rental_status === "active") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "An active rental must be returned and inspected, not cancelled."
      )
    }

    if (booking.order_id && (await orderHasCapturedPayment(container, booking.order_id))) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "This order already has a captured payment. V1 only voids the full order before any capture."
      )
    }

    const cancelled = await rentalService.cancelRental(input.bookingId)

    if (booking.order_id) {
      const siblings = await rentalService.listRentalBookings({
        order_id: booking.order_id,
        rental_status: ["reserved", "active"],
      })
      for (const sibling of siblings) {
        if (sibling.id === booking.id) continue
        await rentalService.cancelRental(sibling.id)
      }

      const appointmentService: AppointmentModuleService =
        container.resolve(APPOINTMENT_MODULE)
      const appointments = await appointmentService.listAppointmentBookings({
        order_id: booking.order_id,
        status: ["pending", "confirmed"],
      })
      for (const appointment of appointments) {
        await appointmentService.cancelAppointment(appointment.id)
      }

      await voidOrderPayment(container, booking.order_id)
    }

    return new StepResponse({ booking: cancelled })
  }
)

export const cancelRentalWorkflow = createWorkflow(
  "cancel-rental",
  (input: CancelRentalInput) => {
    const result = cancelRentalAndOrderStep(input)
    return new WorkflowResponse(result)
  }
)

export default cancelRentalWorkflow
