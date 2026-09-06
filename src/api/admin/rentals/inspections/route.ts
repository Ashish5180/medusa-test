import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RENTAL_MODULE } from "../../../../modules/rental"
import RentalModuleService from "../../../../modules/rental/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const rentalService: RentalModuleService = req.scope.resolve(RENTAL_MODULE)
  const body = req.body as {
    bookingId: string
    conditionOnReturn: string
    damageFee?: number
  }

  if (!body.bookingId || !body.conditionOnReturn) {
    res.status(400).json({
      message: "bookingId and conditionOnReturn are required.",
    })
    return
  }

  try {
    const inspection = await rentalService.processReturnInspection(
      body.bookingId,
      body.conditionOnReturn,
      body.damageFee || 0
    )

    res.json({
      success: true,
      ...inspection,
    })
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || "Failed to process return inspection",
    })
  }
}
