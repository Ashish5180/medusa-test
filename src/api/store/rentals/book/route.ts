import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import createRentalBookingWorkflow, {
  CreateRentalBookingInput,
} from "../../../../workflows/rentals/create-rental-booking"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as CreateRentalBookingInput

  if (!body.itemId || !body.startDate || !body.endDate) {
    res.status(400).json({
      message: "itemId, startDate, and endDate are required.",
    })
    return
  }

  try {
    const { result } = await createRentalBookingWorkflow(req.scope).run({
      input: body,
    })

    res.status(201).json({
      success: true,
      booking: result.booking,
      quote: result.quote,
    })
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || "Failed to create rental booking",
    })
  }
}
