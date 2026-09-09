import { MedusaContainer } from "@medusajs/framework"
import { notifyRental, orderEmail } from "../lib/rental-notify"
import { RENTAL_MODULE } from "../modules/rental"
import RentalModuleService from "../modules/rental/service"

/** Marks active/reserved bookings past end_date as late and emails the customer. */
export default async function rentalOverdue(container: MedusaContainer) {
  const rentalService: RentalModuleService = container.resolve(RENTAL_MODULE)
  const now = new Date()

  const open = await rentalService.listRentalBookings({
    rental_status: ["reserved", "active"],
  })

  for (const booking of open) {
    if (new Date(booking.end_date) >= now) {
      continue
    }

    const item = await rentalService.retrieveRentalItem(booking.item_id)
    const lateFee = await rentalService.calculateLateFee(item, new Date(booking.end_date), now)
    await rentalService.markOverdue(booking.id, lateFee)

    const to = await orderEmail(container, booking.order_id)
    await notifyRental(container, {
      to,
      event: "rental.overdue",
      subject: "Your rental is overdue",
      body: `Booking ${booking.id} was due back ${booking.end_date}. Late fee so far: ${lateFee}.`,
      data: { booking_id: booking.id, late_fee: lateFee },
    })
  }
}

export const config = {
  name: "rental-overdue",
  schedule: "0 * * * *",
}
