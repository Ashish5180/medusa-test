import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { fail, parseBody } from "../../_helpers/http"
import { resolveTenant, vendorScope } from "../../../lib/tenant"
import { ensureRentalCatalogProduct } from "../../../lib/vertical-catalog"
import { RENTAL_MODULE } from "../../../modules/rental"
import RentalModuleService from "../../../modules/rental/service"

const createRentalItemSchema = z.object({
  daily_rate: z.coerce.number().positive("daily_rate must be greater than 0"),
  deposit_amount: z.coerce.number().positive("deposit_amount must be greater than 0"),
  hourly_rate: z.coerce.number().min(0).optional(),
  rental_duration_type: z.enum(["hourly", "daily"]).optional(),
  min_rental_days: z.coerce.number().int().positive().optional(),
  max_rental_days: z.coerce.number().int().positive().optional(),
  minimum_rental_period: z.coerce.number().int().positive().optional(),
  late_fee_per_day: z.coerce.number().min(0).optional(),
  condition_grade: z.string().optional(),
  is_active: z.boolean().optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const rentalService: RentalModuleService = req.scope.resolve(RENTAL_MODULE)
  const scope = vendorScope(await resolveTenant(req))

  const items = await rentalService.listRentalItems(scope, { order: { created_at: "DESC" } })
  const bookings = await rentalService.listRentalBookings(scope, { order: { created_at: "DESC" } })

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
  const tenant = await resolveTenant(req)

  try {
    const item = await rentalService.createRentalItems({
      daily_rate: Math.round(body.daily_rate * 100),
      deposit_amount: Math.round(body.deposit_amount * 100),
      hourly_rate: Math.round((body.hourly_rate || 0) * 100),
      rental_duration_type: body.rental_duration_type || "daily",
      min_rental_days: body.min_rental_days || 1,
      max_rental_days: body.max_rental_days || 5,
      minimum_rental_period: body.minimum_rental_period || body.min_rental_days || 1,
      late_fee_per_day: Math.round((body.late_fee_per_day || 0) * 100),
      condition_grade: body.condition_grade || "Excellent",
      is_active: body.is_active !== undefined ? body.is_active : true,
      vendor_id: tenant.vendor?.id || null,
    })

    await ensureRentalCatalogProduct(req.scope, item)

    res.json({ success: true, item })
  } catch (err) {
    fail(res, err, "Failed to create rental item")
  }
}
