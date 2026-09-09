import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { fail, parseBody } from "../../_helpers/http"
import { ensureRentalCatalogProduct } from "../../../lib/vertical-catalog"
import { RENTAL_MODULE } from "../../../modules/rental"
import RentalModuleService from "../../../modules/rental/service"

const createRentalItemSchema = z.object({
  daily_rate: z.coerce.number().positive("daily_rate must be greater than 0"),
  deposit_amount: z.coerce.number().positive("deposit_amount must be greater than 0"),
  min_rental_days: z.coerce.number().int().positive().optional(),
  max_rental_days: z.coerce.number().int().positive().optional(),
  condition_grade: z.string().optional(),
  is_active: z.boolean().optional(),
})

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
  const body = parseBody(createRentalItemSchema, req.body, res)
  if (!body) {
    return
  }

  const rentalService: RentalModuleService = req.scope.resolve(RENTAL_MODULE)

  try {
    const item = await rentalService.createRentalItems({
      daily_rate: Math.round(body.daily_rate * 100),
      deposit_amount: Math.round(body.deposit_amount * 100),
      min_rental_days: body.min_rental_days || 1,
      max_rental_days: body.max_rental_days || 5,
      condition_grade: body.condition_grade || "Excellent",
      is_active: body.is_active !== undefined ? body.is_active : true,
    })

    await ensureRentalCatalogProduct(req.scope, item)

    res.json({ success: true, item })
  } catch (err) {
    fail(res, err, "Failed to create rental item")
  }
}
