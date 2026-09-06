import { MedusaService } from "@medusajs/framework/utils"
import RentalItem from "./models/rental-item"
import RentalBooking from "./models/rental-booking"

class RentalModuleService extends MedusaService({
  RentalItem,
  RentalBooking,
}) {
  async checkAvailability(itemId: string, startDate: Date, endDate: Date): Promise<boolean> {
    const overlapping = await this.listRentalBookings({
      item_id: itemId,
      rental_status: ["reserved", "active"],
      $or: [
        {
          start_date: { $lte: endDate },
          end_date: { $gte: startDate },
        },
      ],
    })

    return overlapping.length === 0
  }

  async calculateQuote(itemId: string, startDate: Date, endDate: Date) {
    const item = await this.retrieveRentalItem(itemId)
    const diffMs = endDate.getTime() - startDate.getTime()
    const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
    const rentalFee = days * Number(item.daily_rate)
    const deposit = Number(item.deposit_amount)

    return {
      days,
      dailyRate: Number(item.daily_rate),
      rentalFee,
      depositAmount: deposit,
      totalDueAtCheckout: rentalFee + deposit,
    }
  }

  async processReturnInspection(
    bookingId: string,
    returnCondition: string,
    damageFee: number = 0
  ) {
    const booking = await this.retrieveRentalBooking(bookingId)
    const deposit = Number(booking.deposit_amount)
    const refundable = Math.max(0, deposit - damageFee)

    const updated = await this.updateRentalBookings({
      id: bookingId,
      rental_status: "returned",
      condition_on_return: returnCondition,
      damage_fee: damageFee,
      deposit_status: damageFee >= deposit ? "forfeited" : damageFee > 0 ? "partially_refunded" : "refunded",
    })

    return {
      booking: updated,
      depositRefundable: refundable,
      damageFeeDeducted: damageFee,
    }
  }
}

export default RentalModuleService
