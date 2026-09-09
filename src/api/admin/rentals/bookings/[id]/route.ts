import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { fail, parseBody } from "../../../../_helpers/http"
import cancelRentalWorkflow from "../../../../../workflows/rentals/cancel-rental"
import completeRentalWorkflow from "../../../../../workflows/rentals/complete-rental"
import startRentalWorkflow from "../../../../../workflows/rentals/start-rental"
import { RENTAL_MODULE } from "../../../../../modules/rental"
import RentalModuleService from "../../../../../modules/rental/service"

const updateBookingSchema = z.object({
  rental_status: z.enum(["reserved", "active", "returned", "overdue", "cancelled"]).optional(),
  notes: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  condition_on_pickup: z.string().optional(),
  condition_on_return: z.string().optional(),
  damage_fee: z.coerce.number().min(0).optional(),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = parseBody(updateBookingSchema, req.body, res)
  if (!body) {
    return
  }

  try {
    if (body.rental_status === "cancelled") {
      const { result } = await cancelRentalWorkflow(req.scope).run({
        input: { bookingId: req.params.id },
      })
      res.json({ success: true, booking: result.booking })
      return
    }

    if (body.rental_status === "active") {
      const { result } = await startRentalWorkflow(req.scope).run({
        input: {
          bookingId: req.params.id,
          conditionOnPickup: body.condition_on_pickup,
        },
      })
      res.json({ success: true, booking: result })
      return
    }

    if (body.rental_status === "returned") {
      if (!body.condition_on_return) {
        res.status(400).json({ message: "condition_on_return is required when marking a rental returned." })
        return
      }
      const { result } = await completeRentalWorkflow(req.scope).run({
        input: {
          bookingId: req.params.id,
          conditionOnReturn: body.condition_on_return,
          damageFee: body.damage_fee || 0,
        },
      })
      res.json({ success: true, ...result })
      return
    }

    const rentalService: RentalModuleService = req.scope.resolve(RENTAL_MODULE)
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
  try {
    await cancelRentalWorkflow(req.scope).run({
      input: { bookingId: req.params.id },
    })
    const rentalService: RentalModuleService = req.scope.resolve(RENTAL_MODULE)
    await rentalService.deleteRentalBookings(req.params.id)
    res.json({ success: true, id: req.params.id, deleted: true })
  } catch (err) {
    fail(res, err, "Failed to delete booking")
  }
}
