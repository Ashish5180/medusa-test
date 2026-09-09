import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import { DEFAULT_MAX_RENTAL_DAYS, rentalDayCount } from "../../lib/commerce"
import RentalBooking from "./models/rental-booking"
import RentalItem from "./models/rental-item"

class RentalModuleService extends MedusaService({
  RentalItem,
  RentalBooking,
}) {
  async checkAvailability(itemId: string, startDate: Date, endDate: Date, ignoreBookingId?: string): Promise<boolean> {
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

    const blocking = ignoreBookingId
      ? overlapping.filter((booking) => booking.id !== ignoreBookingId)
      : overlapping

    return blocking.length === 0
  }

  async calculateQuote(itemId: string, startDate: Date, endDate: Date) {
    const item = await this.retrieveRentalItem(itemId)
    const days = rentalDayCount(startDate, endDate)
    const minDays = Number(item.min_rental_days || 1)
    const maxDays = Number(item.max_rental_days || DEFAULT_MAX_RENTAL_DAYS)

    if (days < minDays) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `This item requires at least ${minDays} rental day(s).`
      )
    }
    if (days > maxDays) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `V1 rentals are capped at ${maxDays} day(s) so the card authorization does not expire.`
      )
    }

    const rentalFee = days * Number(item.daily_rate)
    const deposit = Number(item.deposit_amount)

    return {
      days,
      dailyRate: Number(item.daily_rate),
      rentalFee,
      depositAmount: deposit,
      totalDueAtCheckout: rentalFee + deposit,
      maxRentalDays: maxDays,
    }
  }

  async startRental(bookingId: string, conditionOnPickup?: string) {
    const booking = await this.retrieveRentalBooking(bookingId)
    if (booking.rental_status === "cancelled") {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Cannot start a cancelled rental.")
    }
    if (booking.rental_status === "returned") {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "This rental has already been returned.")
    }

    return this.updateRentalBookings({
      id: bookingId,
      rental_status: "active",
      condition_on_pickup: conditionOnPickup ?? booking.condition_on_pickup,
      deposit_status: booking.deposit_status === "pending" ? "held" : booking.deposit_status,
    })
  }

  async cancelRental(bookingId: string) {
    const booking = await this.retrieveRentalBooking(bookingId)
    if (booking.rental_status === "cancelled") {
      return booking
    }
    if (booking.rental_status === "returned") {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "A returned rental cannot be cancelled.")
    }

    return this.updateRentalBookings({
      id: bookingId,
      rental_status: "cancelled",
      deposit_status: booking.deposit_status === "held" ? "refunded" : booking.deposit_status,
    })
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
