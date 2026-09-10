import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { fail, parseBody } from "../../../_helpers/http"
import completeRentalWorkflow from "../../../../workflows/rentals/complete-rental"

const schema = z.object({
  bookingId: z.string().min(1, "bookingId is required"),
  conditionOnReturn: z.string().min(1, "conditionOnReturn is required"),
  damageFee: z.coerce.number().min(0).optional(),
  lateFee: z.coerce.number().min(0).optional(),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = parseBody(schema, req.body, res)
  if (!body) {
    return
  }

  try {
    const { result } = await completeRentalWorkflow(req.scope).run({
      input: {
        bookingId: body.bookingId,
        conditionOnReturn: body.conditionOnReturn,
        damageFee: body.damageFee || 0,
        lateFee: body.lateFee || 0,
      },
    })

    res.json({
      success: true,
      ...result,
    })
  } catch (err) {
    fail(res, err, "Failed to process return inspection")
  }
}
