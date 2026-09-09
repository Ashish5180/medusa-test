import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import {
  DEFAULT_MAX_RENTAL_DAYS,
  rentalDayCount,
  rentalHourCount,
  rentalPeriodCount,
} from "../../lib/commerce"
import RentalBooking from "./models/rental-booking"
import RentalItem from "./models/rental-item"

type ReturnStatus = "pending" | "active" | "returned" | "late" | "damaged"

function returnStatusFor(
  rentalStatus: string,
  damageFee = 0
): ReturnStatus {
  if (rentalStatus === "cancelled") {
    return "pending"
  }
  if (rentalStatus === "overdue") {
    return "late"
  }
  if (rentalStatus === "returned") {
    return damageFee > 0 ? "damaged" : "returned"
  }
  if (rentalStatus === "active") {
    return "active"
  }
  return "pending"
}

class RentalModuleService extends MedusaService({
  RentalItem,
  RentalBooking,
}) {
  async checkAvailability(
    itemId: string,
    startDate: Date,
    endDate: Date,
    ignoreBookingId?: string
  ): Promise<boolean> {
    const overlapping = await this.listRentalBookings({
      item_id: itemId,
      rental_status: ["reserved", "active", "overdue"],
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

  /** Inclusive date strings (YYYY-MM-DD) already held by reserved/active/overdue bookings. */
  async listBlockedDates(itemId: string): Promise<string[]> {
    const bookings = await this.listRentalBookings({
      item_id: itemId,
      rental_status: ["reserved", "active", "overdue"],
    })

    const blocked = new Set<string>()
    for (const booking of bookings) {
      const cursor = new Date(booking.start_date)
      cursor.setUTCHours(0, 0, 0, 0)
      const last = new Date(booking.end_date)
      last.setUTCHours(0, 0, 0, 0)
      while (cursor <= last) {
        blocked.add(cursor.toISOString().slice(0, 10))
        cursor.setUTCDate(cursor.getUTCDate() + 1)
      }
    }
    return Array.from(blocked).sort()
  }

  async calculateQuote(itemId: string, startDate: Date, endDate: Date) {
    const item = await this.retrieveRentalItem(itemId)
    const durationType = item.rental_duration_type === "hourly" ? "hourly" : "daily"
    const periods = rentalPeriodCount(startDate, endDate, durationType)
    const minPeriod = Number(item.minimum_rental_period || item.min_rental_days || 1)
    const maxDays = Number(item.max_rental_days || DEFAULT_MAX_RENTAL_DAYS)
    const days = rentalDayCount(startDate, endDate)
    const hours = rentalHourCount(startDate, endDate)

    if (periods < minPeriod) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        durationType === "hourly"
          ? `This item requires at least ${minPeriod} rental hour(s).`
          : `This item requires at least ${minPeriod} rental day(s).`
      )
    }
    if (days > maxDays) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `V1 rentals are capped at ${maxDays} day(s) so the card authorization does not expire.`
      )
    }

    const hourlyRate = Number(item.hourly_rate || 0)
    const dailyRate = Number(item.daily_rate)
    const rate = durationType === "hourly" ? hourlyRate || Math.round(dailyRate / 24) : dailyRate
    const rentalFee = periods * rate
    const deposit = Number(item.deposit_amount)

    return {
      days,
      hours,
      periods,
      durationType,
      dailyRate,
      hourlyRate: rate,
      rentalFee,
      depositAmount: deposit,
      securityDepositAmount: deposit,
      lateFeePerDay: Number(item.late_fee_per_day || 0),
      totalDueAtCheckout: rentalFee + deposit,
      maxRentalDays: maxDays,
      minimumRentalPeriod: minPeriod,
    }
  }

  async calculateLateFee(
    item: { late_fee_per_day?: number },
    endDate: Date,
    asOf = new Date()
  ): Promise<number> {
    if (asOf <= endDate) {
      return 0
    }
    const lateDays = rentalDayCount(endDate, asOf)
    return lateDays * Number(item.late_fee_per_day || 0)
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
      return_status: "active",
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
      return_status: "pending",
      deposit_status: booking.deposit_status === "held" ? "refunded" : booking.deposit_status,
    })
  }

  async markOverdue(bookingId: string, lateFee = 0) {
    const booking = await this.retrieveRentalBooking(bookingId)
    if (!["reserved", "active", "overdue"].includes(booking.rental_status)) {
      return booking
    }

    return this.updateRentalBookings({
      id: bookingId,
      rental_status: "overdue",
      return_status: "late",
      late_fee: lateFee,
      overdue_notified_at: new Date(),
    })
  }

  async processReturnInspection(
    bookingId: string,
    returnCondition: string,
    damageFee: number = 0,
    lateFee: number = 0
  ) {
    const booking = await this.retrieveRentalBooking(bookingId)
    const deposit = Number(booking.deposit_amount)
    const charges = Math.max(0, Number(damageFee) + Number(lateFee))
    const refundable = Math.max(0, deposit - charges)
    const returnStatus = returnStatusFor("returned", damageFee)

    const updated = await this.updateRentalBookings({
      id: bookingId,
      rental_status: "returned",
      return_status: returnStatus,
      condition_on_return: returnCondition,
      damage_fee: damageFee,
      late_fee: lateFee,
      deposit_status:
        charges >= deposit ? "forfeited" : charges > 0 ? "partially_refunded" : "refunded",
    })

    return {
      booking: updated,
      depositRefundable: refundable,
      damageFeeDeducted: damageFee,
      lateFeeDeducted: lateFee,
    }
  }
}

export default RentalModuleService
