import { MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { RENTAL_MODULE } from "../../modules/rental"
import RentalModuleService from "../../modules/rental/service"

export type CreateRentalBookingInput = {
  itemId: string
  startDate: string
  endDate: string
  orderId?: string
  customerId?: string
  cartId?: string
  notes?: string
}

export const validateAndQuoteRentalStep = createStep(
  "validate-and-quote-rental",
  async (input: CreateRentalBookingInput, { container }) => {
    const rentalService: RentalModuleService = container.resolve(RENTAL_MODULE)
    const start = new Date(input.startDate)
    const end = new Date(input.endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Invalid start or end date provided."
      )
    }
    if (end <= start) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "End date must be after start date."
      )
    }

    const isAvailable = await rentalService.checkAvailability(input.itemId, start, end)
    if (!isAvailable) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Selected item is not available for the requested rental dates."
      )
    }

    const quote = await rentalService.calculateQuote(input.itemId, start, end)

    return new StepResponse({
      quote,
      start,
      end,
    })
  }
)

export const createRentalBookingRecordStep = createStep(
  "create-rental-booking-record",
  async (
    input: {
      itemId: string
      startDate: Date
      endDate: Date
      rentalFee: number
      depositAmount: number
      orderId?: string
      customerId?: string
      cartId?: string
      notes?: string
    },
    { container }
  ) => {
    const rentalService: RentalModuleService = container.resolve(RENTAL_MODULE)
    const item = await rentalService.retrieveRentalItem(input.itemId)

    const booking = await rentalService.createRentalBookings({
      item_id: input.itemId,
      start_date: input.startDate,
      end_date: input.endDate,
      total_rental_fee: input.rentalFee,
      deposit_amount: input.depositAmount,
      deposit_status: "pending",
      rental_status: "reserved",
      order_id: input.orderId,
      customer_id: input.customerId,
      cart_id: input.cartId,
      notes: input.notes,
      vendor_id: item.vendor_id || null,
    })

    return new StepResponse(booking, booking.id)
  },
  async (bookingId: string | undefined, { container }) => {
    if (!bookingId) return
    const rentalService: RentalModuleService = container.resolve(RENTAL_MODULE)
    await rentalService.deleteRentalBookings([bookingId])
  }
)

export const createRentalBookingWorkflow = createWorkflow(
  "create-rental-booking",
  (input: CreateRentalBookingInput) => {
    const quoteResult = validateAndQuoteRentalStep(input)

    const booking = createRentalBookingRecordStep({
      itemId: input.itemId,
      startDate: quoteResult.start,
      endDate: quoteResult.end,
      rentalFee: quoteResult.quote.rentalFee,
      depositAmount: quoteResult.quote.depositAmount,
      orderId: input.orderId,
      customerId: input.customerId,
      cartId: input.cartId,
      notes: input.notes,
    })

    return new WorkflowResponse({
      booking,
      quote: quoteResult.quote,
    })
  }
)

export default createRentalBookingWorkflow
