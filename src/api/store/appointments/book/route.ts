import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { fail, parseBody } from "../../../_helpers/http"
import addAppointmentToCartWorkflow from "../../../../workflows/cart/add-appointment-to-cart"

const schema = z.object({
  cart_id: z.string().min(1, "cart_id is required. Create a cart first, then add the slot to it."),
  slotId: z.string().min(1, "slotId is required"),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerPhone: z.string().optional(),
  customerId: z.string().optional(),
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
        cartId: body.cart_id,
        slotId: body.slotId,
        customerName: body.customerName,
        customerEmail: body.customerEmail || undefined,
        customerPhone: body.customerPhone,
        customerId: body.customerId,
        notes: body.notes,
      },
    })

    res.status(201).json({
      success: true,
      booking: result.booking,
      line_item_id: result.lineItemId,
    })
  } catch (err) {
    fail(res, err, "Failed to add appointment to cart")
  }
}
