import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { centsToAmount } from "../../lib/commerce"
import { captureOrderAmount } from "../../lib/order-payment"
import { RENTAL_MODULE } from "../../modules/rental"
import RentalModuleService from "../../modules/rental/service"

export type StartRentalInput = {
  bookingId: string
  conditionOnPickup?: string
}

const startRentalRecordStep = createStep(
  "start-rental-record",
  async (input: StartRentalInput, { container }) => {
    const rentalService: RentalModuleService = container.resolve(RENTAL_MODULE)
    const previous = await rentalService.retrieveRentalBooking(input.bookingId)
    const booking = await rentalService.startRental(input.bookingId, input.conditionOnPickup)
    return new StepResponse({ booking, previousStatus: previous.rental_status }, {
      bookingId: input.bookingId,
      previousStatus: previous.rental_status,
    })
  },
  async (compensate: { bookingId?: string; previousStatus?: string } | undefined, { container }) => {
    if (!compensate?.bookingId || !compensate.previousStatus) return
    const rentalService: RentalModuleService = container.resolve(RENTAL_MODULE)
    await rentalService.updateRentalBookings({
      id: compensate.bookingId,
      rental_status: compensate.previousStatus as
        | "reserved"
        | "active"
        | "returned"
        | "overdue"
        | "cancelled",
    })
  }
)

const captureRentalFeeStep = createStep(
  "capture-rental-fee",
  async (
    booking: {
      order_id?: string | null
      total_rental_fee?: number
    },
    { container }
  ) => {
    if (!booking.order_id) {
      return new StepResponse({ skipped: true })
    }

    const amount = centsToAmount(Number(booking.total_rental_fee || 0))
    if (!amount) {
      return new StepResponse({ skipped: true, reason: "missing_fee" })
    }

    return new StepResponse(await captureOrderAmount(container, booking.order_id, amount))
  }
)

export const startRentalWorkflow = createWorkflow(
  "start-rental",
  (input: StartRentalInput) => {
    const record = startRentalRecordStep(input)
    captureRentalFeeStep(record.booking)
    return new WorkflowResponse(record.booking)
  }
)

export default startRentalWorkflow
