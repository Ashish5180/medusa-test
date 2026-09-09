import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { fail, parseBody } from "../../../../../_helpers/http"
import addEventToCartWorkflow from "../../../../../../workflows/cart/add-event-to-cart"

const schema = z.object({
  event_id: z.string().min(1, "event_id is required"),
  ticket_tier: z.string().optional(),
  attendee_name: z.string().optional(),
  attendee_email: z.string().email().optional(),
  quantity: z.coerce.number().int().positive().optional(),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = parseBody(schema, req.body, res)
  if (!body) {
    return
  }

  try {
    const { result } = await addEventToCartWorkflow(req.scope).run({
      input: {
        cartId: req.params.id,
        eventId: body.event_id,
        ticketTier: body.ticket_tier,
        attendeeName: body.attendee_name,
        attendeeEmail: body.attendee_email,
        quantity: body.quantity,
      },
    })

    res.status(201).json({
      success: true,
      line_item_id: result.lineItemId,
      product_id: result.productId,
      remaining_capacity: result.remainingCapacity,
    })
  } catch (err) {
    fail(res, err, "Failed to add event ticket to cart")
  }
}
