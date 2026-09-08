import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { fail, parseBody } from "../../../_helpers/http"
import { RENTAL_MODULE } from "../../../../modules/rental"
import RentalModuleService from "../../../../modules/rental/service"

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

  const rentalService: RentalModuleService = req.scope.resolve(RENTAL_MODULE)

  try {
    const start = new Date(body.startDate)
    const end = new Date(body.endDate)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      res.status(400).json({ message: "endDate must be after startDate." })
      return
    }

    const isAvailable = await rentalService.checkAvailability(body.itemId, start, end)
    if (!isAvailable) {
      res.status(400).json({ message: "Selected item is already booked for these dates." })
      return
    }

    const quote = await rentalService.calculateQuote(body.itemId, start, end)

    const booking = await rentalService.createRentalBookings({
      item_id: body.itemId,
      start_date: start,
      end_date: end,
      total_rental_fee: quote.rentalFee,
      deposit_amount: quote.depositAmount,
      deposit_status: "held",
      rental_status: "active",
      notes: body.customerNotes,
    })

    res.json({ success: true, booking })
  } catch (err) {
    fail(res, err, "Failed to create booking")
  }
}
