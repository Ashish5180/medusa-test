import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RENTAL_MODULE } from "../../../../modules/rental"
import RentalModuleService from "../../../../modules/rental/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const rentalService: RentalModuleService = req.scope.resolve(RENTAL_MODULE)
  const items = await rentalService.listRentalItems({
    is_active: true,
  })

  res.json({
    items,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const rentalService: RentalModuleService = req.scope.resolve(RENTAL_MODULE)
  const body = req.body as {
    itemId: string
    startDate: string
    endDate: string
  }

  if (!body.itemId || !body.startDate || !body.endDate) {
    res.status(400).json({
      message: "itemId, startDate, and endDate are required.",
    })
    return
  }

  const start = new Date(body.startDate)
  const end = new Date(body.endDate)

  try {
    const isAvailable = await rentalService.checkAvailability(body.itemId, start, end)
    const quote = await rentalService.calculateQuote(body.itemId, start, end)

    res.json({
      isAvailable,
      quote,
    })
  } catch (err: any) {
    res.status(400).json({
      message: err.message || "Failed to calculate rental quote",
    })
  }
}
