import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { fail, parseBody } from "../../../../../_helpers/http"
import addRentalToCartWorkflow from "../../../../../../workflows/cart/add-rental-to-cart"

const schema = z.object({
  item_id: z.string().min(1, "item_id is required"),
  start_date: z.string().min(1, "start_date is required"),
  end_date: z.string().min(1, "end_date is required"),
  customer_id: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = parseBody(schema, req.body, res)
  if (!body) {
    return
  }

  try {
    const { result } = await addRentalToCartWorkflow(req.scope).run({
      input: {
        cartId: req.params.id,
        itemId: body.item_id,
        startDate: body.start_date,
        endDate: body.end_date,
        customerId: body.customer_id,
        notes: body.notes,
      },
    })

    res.status(201).json({
      success: true,
      booking: result.booking,
      quote: result.quote,
      fee_line_item_id: result.feeLineItemId,
      deposit_line_item_id: result.depositLineItemId,
      product_id: result.productId,
    })
  } catch (err) {
    fail(res, err, "Failed to add rental to cart")
  }
}
