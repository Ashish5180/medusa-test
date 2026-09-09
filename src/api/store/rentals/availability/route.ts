import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RENTAL_MODULE } from "../../../../modules/rental"
import RentalModuleService from "../../../../modules/rental/service"

/**
 * Date-picker payload: blocked days plus a live quote when start/end are sent.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const itemId = String(req.query.item_id || req.query.itemId || "")
  if (!itemId) {
    res.status(400).json({ message: "item_id is required." })
    return
  }

  const rentalService: RentalModuleService = req.scope.resolve(RENTAL_MODULE)

  try {
    const item = await rentalService.retrieveRentalItem(itemId)
    const blocked_dates = await rentalService.listBlockedDates(itemId)

    const start = req.query.start_date || req.query.startDate
    const end = req.query.end_date || req.query.endDate
    let quote: Awaited<ReturnType<RentalModuleService["calculateQuote"]>> | null = null
    let available = true

    if (typeof start === "string" && typeof end === "string") {
      const startDate = new Date(start)
      const endDate = new Date(end)
      available = await rentalService.checkAvailability(itemId, startDate, endDate)
      if (available) {
        quote = await rentalService.calculateQuote(itemId, startDate, endDate)
      }
    }

    res.json({
      item_id: itemId,
      rental_duration_type: item.rental_duration_type,
      minimum_rental_period: item.minimum_rental_period || item.min_rental_days,
      max_rental_days: item.max_rental_days,
      late_fee_per_day: item.late_fee_per_day,
      security_deposit_amount: item.deposit_amount,
      blocked_dates,
      available,
      quote,
    })
  } catch (err) {
    res.status(400).json({
      message: err instanceof Error ? err.message : "Failed to load rental availability",
    })
  }
}
