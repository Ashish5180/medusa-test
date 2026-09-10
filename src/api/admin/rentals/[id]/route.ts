import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { fail, parseBody } from "../../../_helpers/http"
import { RENTAL_MODULE } from "../../../../modules/rental"
import RentalModuleService from "../../../../modules/rental/service"

const updateRentalItemSchema = z.object({
  daily_rate: z.coerce.number().positive().optional(),
  deposit_amount: z.coerce.number().positive().optional(),
  hourly_rate: z.coerce.number().min(0).optional(),
  rental_duration_type: z.enum(["hourly", "daily"]).optional(),
  min_rental_days: z.coerce.number().int().positive().optional(),
  max_rental_days: z.coerce.number().int().positive().optional(),
  minimum_rental_period: z.coerce.number().int().positive().optional(),
  late_fee_per_day: z.coerce.number().min(0).optional(),
  condition_grade: z.string().optional(),
  is_active: z.boolean().optional(),
})

function toCents(value: number) {
  return Math.round(value * 100)
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const rentalService: RentalModuleService = req.scope.resolve(RENTAL_MODULE)

  try {
    const item = await rentalService.retrieveRentalItem(req.params.id)
    res.json({ item })
  } catch {
    res.status(404).json({ message: `Rental item ${req.params.id} not found.` })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = parseBody(updateRentalItemSchema, req.body, res)
  if (!body) {
    return
  }

  const rentalService: RentalModuleService = req.scope.resolve(RENTAL_MODULE)

  try {
    const item = await rentalService.updateRentalItems({
      id: req.params.id,
      ...(body.daily_rate !== undefined ? { daily_rate: toCents(body.daily_rate) } : {}),
      ...(body.deposit_amount !== undefined
        ? { deposit_amount: toCents(body.deposit_amount) }
        : {}),
      ...(body.hourly_rate !== undefined ? { hourly_rate: toCents(body.hourly_rate) } : {}),
      ...(body.rental_duration_type !== undefined
        ? { rental_duration_type: body.rental_duration_type }
        : {}),
      ...(body.min_rental_days !== undefined ? { min_rental_days: body.min_rental_days } : {}),
      ...(body.max_rental_days !== undefined ? { max_rental_days: body.max_rental_days } : {}),
      ...(body.minimum_rental_period !== undefined
        ? { minimum_rental_period: body.minimum_rental_period }
        : {}),
      ...(body.late_fee_per_day !== undefined
        ? { late_fee_per_day: toCents(body.late_fee_per_day) }
        : {}),
      ...(body.condition_grade !== undefined ? { condition_grade: body.condition_grade } : {}),
      ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
    })

    res.json({ success: true, item })
  } catch (err) {
    fail(res, err, "Failed to update rental item")
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const rentalService: RentalModuleService = req.scope.resolve(RENTAL_MODULE)

  try {
    const activeBookings = await rentalService.listRentalBookings({
      item_id: req.params.id,
      rental_status: ["reserved", "active"],
    })

    if (activeBookings.length) {
      res.status(400).json({
        message: "Cannot delete a rental item that still has reserved or active bookings.",
      })
      return
    }

    await rentalService.deleteRentalItems(req.params.id)
    res.json({ success: true, id: req.params.id, deleted: true })
  } catch (err) {
    fail(res, err, "Failed to delete rental item")
  }
}
