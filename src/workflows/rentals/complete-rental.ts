import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { centsToAmount } from "../../lib/commerce"
import { captureOrderAmount, refundOrderAmount } from "../../lib/order-payment"
import { RENTAL_MODULE } from "../../modules/rental"
import RentalModuleService from "../../modules/rental/service"

export type CompleteRentalInput = {
  bookingId: string
  conditionOnReturn: string
  damageFee?: number
}

const inspectRentalStep = createStep(
  "inspect-rental-return",
  async (input: CompleteRentalInput, { container }) => {
    const rentalService: RentalModuleService = container.resolve(RENTAL_MODULE)
    const previous = await rentalService.retrieveRentalBooking(input.bookingId)
    const result = await rentalService.processReturnInspection(
      input.bookingId,
      input.conditionOnReturn,
      input.damageFee || 0
    )
    return new StepResponse(
      { ...result, previousStatus: previous.rental_status, previousDeposit: previous.deposit_status },
      {
        bookingId: input.bookingId,
        previousStatus: previous.rental_status,
        previousDeposit: previous.deposit_status,
      }
    )
  },
  async (
    compensate:
      | { bookingId?: string; previousStatus?: string; previousDeposit?: string }
      | undefined,
    { container }
  ) => {
    if (!compensate?.bookingId) return
    const rentalService: RentalModuleService = container.resolve(RENTAL_MODULE)
    await rentalService.updateRentalBookings({
      id: compensate.bookingId,
      rental_status: (compensate.previousStatus || "active") as
        | "reserved"
        | "active"
        | "returned"
        | "overdue"
        | "cancelled",
      deposit_status: (compensate.previousDeposit || "held") as
        | "pending"
        | "held"
        | "refunded"
        | "partially_refunded"
        | "forfeited",
    })
  }
)

const settleRentalDepositStep = createStep(
  "settle-rental-deposit",
  async (
    input: {
      booking: { order_id?: string | null; deposit_amount?: number }
      damageFeeDeducted: number
    },
    { container }
  ) => {
    const orderId = input.booking.order_id
    if (!orderId) {
      return new StepResponse({ skipped: true })
    }

    const damage = Number(input.damageFeeDeducted || 0)
    if (damage > 0) {
      return new StepResponse(
        await captureOrderAmount(container, orderId, centsToAmount(damage))
      )
    }

    const leftover = Number(input.booking.deposit_amount || 0)
    if (leftover > 0) {
      try {
        await refundOrderAmount(
          container,
          orderId,
          centsToAmount(leftover),
          "Unused rental deposit released"
        )
      } catch {
        // Deposit was authorized, not captured — cancel remainder by skipping capture.
      }
    }

    return new StepResponse({ skipped: damage === 0 })
  }
)

export const completeRentalWorkflow = createWorkflow(
  "complete-rental",
  (input: CompleteRentalInput) => {
    const inspection = inspectRentalStep(input)
    settleRentalDepositStep({
      booking: inspection.booking,
      damageFeeDeducted: inspection.damageFeeDeducted,
    })
    return new WorkflowResponse(inspection)
  }
)

export default completeRentalWorkflow
