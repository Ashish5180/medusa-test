import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { fail, parseBody } from "../../../_helpers/http"
import createRentalBookingWorkflow from "../../../../workflows/rentals/create-rental-booking"

const createBookingSchema = z.object({
  itemId: z.string().min(1, "itemId is required"),
  startDate: z.string().min(1, "startDate is required"),
  endDate: z.string().min(1, "endDate is required"),
  customerNotes: z.string().optional(),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = parseBody(createBookingSchema, req.body, res)
  if (!body) {
    return
  }

  try {
    const { result } = await createRentalBookingWorkflow(req.scope).run({
      input: {
        itemId: body.itemId,
        startDate: body.startDate,
        endDate: body.endDate,
        notes: body.customerNotes,
      },
    })

    res.json({ success: true, booking: result.booking, quote: result.quote })
  } catch (err) {
    fail(res, err, "Failed to create booking")
  }
}
