import { MedusaContainer } from "@medusajs/framework"
import { notifyRental, orderEmail } from "../lib/rental-notify"
import { RENTAL_MODULE } from "../modules/rental"
import RentalModuleService from "../modules/rental/service"

const REMINDER_HOURS = 24

/** Emails customers whose return window is inside the next 24 hours. */
export default async function rentalReturnReminders(container: MedusaContainer) {
  const rentalService: RentalModuleService = container.resolve(RENTAL_MODULE)
  const now = Date.now()
  const horizon = now + REMINDER_HOURS * 60 * 60 * 1000

  const open = await rentalService.listRentalBookings({
    rental_status: ["reserved", "active"],
  })

  for (const booking of open) {
    if (booking.reminder_sent_at) {
      continue
    }
    const due = new Date(booking.end_date).getTime()
    if (due < now || due > horizon) {
      continue
    }

    const to = await orderEmail(container, booking.order_id)
    await notifyRental(container, {
      to,
      event: "rental.return_reminder",
      subject: "Your rental is due back tomorrow",
      body: `Please return booking ${booking.id} by ${booking.end_date}. Late fees may apply after that.`,
      data: { booking_id: booking.id, end_date: booking.end_date },
    })

    await rentalService.updateRentalBookings({
      id: booking.id,
      reminder_sent_at: new Date(),
    })
  }
}

export const config = {
  name: "rental-return-reminders",
  schedule: "0 */6 * * *",
}
