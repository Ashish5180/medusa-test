import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { fail, parseBody } from "../../../_helpers/http"
import addRentalToCartWorkflow from "../../../../workflows/cart/add-rental-to-cart"

const schema = z.object({
  cart_id: z.string().min(1, "cart_id is required. Create a cart first, then add the rental to it."),
  itemId: z.string().min(1, "itemId is required"),
  startDate: z.string().min(1, "startDate is required"),
  endDate: z.string().min(1, "endDate is required"),
  customerId: z.string().optional(),
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
        cartId: body.cart_id,
        itemId: body.itemId,
        startDate: body.startDate,
        endDate: body.endDate,
        customerId: body.customerId,
        notes: body.notes,
      },
    })

    res.status(201).json({
      success: true,
      booking: result.booking,
      quote: result.quote,
    })
  } catch (err) {
    fail(res, err, "Failed to add rental to cart")
  }
}
