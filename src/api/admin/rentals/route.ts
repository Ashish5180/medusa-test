import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RENTAL_MODULE } from "../../../modules/rental"
import RentalModuleService from "../../../modules/rental/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const rentalService: RentalModuleService = req.scope.resolve(RENTAL_MODULE)

  const items = await rentalService.listRentalItems({}, { order: { created_at: "DESC" } })
  const bookings = await rentalService.listRentalBookings({}, { order: { created_at: "DESC" } })

  res.json({
    items,
    bookings,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const rentalService: RentalModuleService = req.scope.resolve(RENTAL_MODULE)
  const body = req.body as {
    daily_rate: number
    deposit_amount: number
    min_rental_days?: number
    condition_grade?: string
    is_active?: boolean
  }

  if (!body.daily_rate || !body.deposit_amount) {
    res.status(400).json({ message: "daily_rate and deposit_amount are required." })
    return
  }

  try {
    const item = await rentalService.createRentalItems({
      daily_rate: Math.round(Number(body.daily_rate) * 100), // convert $ to cents
      deposit_amount: Math.round(Number(body.deposit_amount) * 100),
      min_rental_days: Number(body.min_rental_days) || 1,
      condition_grade: body.condition_grade || "Excellent",
      is_active: body.is_active !== undefined ? Boolean(body.is_active) : true,
    })

    res.json({ success: true, item })
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || "Failed to create rental item" })
  }
}
