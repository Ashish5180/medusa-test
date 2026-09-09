import { MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { addToCartWorkflow } from "@medusajs/medusa/core-flows"
import { centsToAmount, RENTAL_LINE_KIND, VERTICAL } from "../../lib/commerce"
import { firstVariantId, getProductForRentalItem } from "../../lib/vertical-catalog"
import { RENTAL_MODULE } from "../../modules/rental"
import RentalModuleService from "../../modules/rental/service"
import createRentalBookingWorkflow from "../rentals/create-rental-booking"

export type AddRentalToCartInput = {
  cartId: string
  itemId: string
  startDate: string
  endDate: string
  customerId?: string
  notes?: string
}

const addRentalLinesStep = createStep(
  "add-rental-lines-to-cart",
  async (
    input: AddRentalToCartInput & {
      bookingId: string
      rentalFee: number
      depositAmount: number
      days?: number
      dailyRate?: number
    },
    { container }
  ) => {
    const product = await getProductForRentalItem(container, input.itemId)
    const variantId = firstVariantId(product)
    const rentalService: RentalModuleService = container.resolve(RENTAL_MODULE)
    const rentalItem = await rentalService.retrieveRentalItem(input.itemId)

    await addToCartWorkflow(container).run({
      input: {
        cart_id: input.cartId,
        items: [
          {
            variant_id: variantId,
            quantity: 1,
            unit_price: centsToAmount(input.rentalFee),
            requires_shipping: false,
            title: `${product.title} · rental fee`,
            metadata: {
              vertical: VERTICAL.RENTAL,
              type: "rental",
              kind: RENTAL_LINE_KIND.FEE,
              refundable: false,
              booking_id: input.bookingId,
              item_id: input.itemId,
              start_date: input.startDate,
              end_date: input.endDate,
              rental_days: input.days,
              daily_rate: input.dailyRate,
              rental_start_date: input.startDate,
              rental_end_date: input.endDate,
              security_deposit_price: input.depositAmount,
              late_fee_rate: rentalItem.late_fee_per_day ?? 0,
              amount_cents: input.rentalFee,
            },
          },
          {
            variant_id: variantId,
            quantity: 1,
            unit_price: centsToAmount(input.depositAmount),
            requires_shipping: false,
            title: `${product.title} · security deposit`,
            metadata: {
              vertical: VERTICAL.RENTAL,
              kind: RENTAL_LINE_KIND.DEPOSIT,
              refundable: true,
              booking_id: input.bookingId,
              item_id: input.itemId,
              start_date: input.startDate,
              end_date: input.endDate,
              amount_cents: input.depositAmount,
            },
          },
        ],
      },
    })

    const query = container.resolve("query") as {
      graph: (args: Record<string, unknown>) => Promise<{ data: any[] }>
    }
    const { data } = await query.graph({
      entity: "cart",
      fields: ["id", "items.id", "items.metadata", "items.unit_price"],
      filters: { id: input.cartId },
    })

    const lines = (data[0]?.items || []).filter(
      (item: { metadata?: Record<string, unknown> }) =>
        item.metadata?.booking_id === input.bookingId
    )
    const feeLine = lines.find(
      (item: { metadata?: Record<string, unknown> }) =>
        item.metadata?.kind === RENTAL_LINE_KIND.FEE
    )
    const depositLine = lines.find(
      (item: { metadata?: Record<string, unknown> }) =>
        item.metadata?.kind === RENTAL_LINE_KIND.DEPOSIT
    )

    if (!feeLine?.id || !depositLine?.id) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Rental was reserved but cart fee/deposit lines were not created."
      )
    }

    await rentalService.updateRentalBookings({
      id: input.bookingId,
      fee_line_item_id: feeLine.id,
      deposit_line_item_id: depositLine.id,
    })

    return new StepResponse({
      feeLineItemId: feeLine.id,
      depositLineItemId: depositLine.id,
      productId: product.id,
    })
  }
)

export const addRentalToCartWorkflow = createWorkflow(
  "add-rental-to-cart",
  (input: AddRentalToCartInput) => {
    const created = createRentalBookingWorkflow.runAsStep({
      input: {
        itemId: input.itemId,
        startDate: input.startDate,
        endDate: input.endDate,
        customerId: input.customerId,
        cartId: input.cartId,
        notes: input.notes,
      },
    })

    const lineInput = transform({ input, created }, (data) => ({
      cartId: data.input.cartId,
      itemId: data.input.itemId,
      startDate: data.input.startDate,
      endDate: data.input.endDate,
      customerId: data.input.customerId,
      notes: data.input.notes,
      bookingId: data.created.booking.id,
      rentalFee: data.created.quote.rentalFee,
      depositAmount: data.created.quote.depositAmount,
      days: data.created.quote.days,
      dailyRate: data.created.quote.dailyRate,
    }))

    const lines = addRentalLinesStep(lineInput)

    return new WorkflowResponse({
      booking: created.booking,
      quote: created.quote,
      feeLineItemId: lines.feeLineItemId,
      depositLineItemId: lines.depositLineItemId,
      productId: lines.productId,
    })
  }
)

export default addRentalToCartWorkflow
