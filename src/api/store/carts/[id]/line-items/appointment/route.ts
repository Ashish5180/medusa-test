import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { fail, parseBody } from "../../../../../_helpers/http"
import addAppointmentToCartWorkflow from "../../../../../../workflows/cart/add-appointment-to-cart"

const schema = z.object({
  slot_id: z.string().min(1, "slot_id is required"),
  customer_name: z.string().optional(),
  customer_email: z.string().email().optional().or(z.literal("")),
  customer_phone: z.string().optional(),
  customer_id: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = parseBody(schema, req.body, res)
  if (!body) {
    return
  }

  try {
    const { result } = await addAppointmentToCartWorkflow(req.scope).run({
      input: {
        cartId: req.params.id,
        slotId: body.slot_id,
        customerName: body.customer_name,
        customerEmail: body.customer_email || undefined,
        customerPhone: body.customer_phone,
        customerId: body.customer_id,
        notes: body.notes,
      },
    })

    res.status(201).json({
      success: true,
      booking: result.booking,
      line_item_id: result.lineItemId,
      product_id: result.productId,
    })
  } catch (err) {
    fail(res, err, "Failed to add appointment to cart")
  }
}
