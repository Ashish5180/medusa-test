import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RENTAL_MODULE } from "../../../../modules/rental"
import RentalModuleService from "../../../../modules/rental/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const rentalService: RentalModuleService = req.scope.resolve(RENTAL_MODULE)
  const body = req.body as {
    itemId: string
    startDate: string
    endDate: string
    customerNotes?: string
  }

  if (!body.itemId || !body.startDate || !body.endDate) {
    res.status(400).json({ message: "itemId, startDate, and endDate are required." })
    return
  }

  try {
    const start = new Date(body.startDate)
    const end = new Date(body.endDate)

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
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || "Failed to create booking" })
  }
}
