import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { fail, parseBody } from "../../../../_helpers/http"
import { RENTAL_MODULE } from "../../../../../modules/rental"
import RentalModuleService from "../../../../../modules/rental/service"

const updateBookingSchema = z.object({
  rental_status: z.enum(["reserved", "active", "returned", "overdue", "cancelled"]).optional(),
  notes: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = parseBody(updateBookingSchema, req.body, res)
  if (!body) {
    return
  }

  const rentalService: RentalModuleService = req.scope.resolve(RENTAL_MODULE)

  try {
    const booking = await rentalService.updateRentalBookings({
      id: req.params.id,
      ...(body.rental_status ? { rental_status: body.rental_status } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.start_date ? { start_date: new Date(body.start_date) } : {}),
      ...(body.end_date ? { end_date: new Date(body.end_date) } : {}),
    })

    res.json({ success: true, booking })
  } catch (err) {
    fail(res, err, "Failed to update booking")
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const rentalService: RentalModuleService = req.scope.resolve(RENTAL_MODULE)

  try {
    await rentalService.deleteRentalBookings(req.params.id)
    res.json({ success: true, id: req.params.id, deleted: true })
  } catch (err) {
    fail(res, err, "Failed to delete booking")
  }
}
