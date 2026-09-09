import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { notifyRental, orderEmail } from "../lib/rental-notify"
import { RENTAL_MODULE } from "../modules/rental"
import RentalModuleService from "../modules/rental/service"
import startRentalWorkflow from "../workflows/rentals/start-rental"

/**
 * Official rentals recipe: fulfillment means the item has left the warehouse.
 * We flip reserved bookings on this order to active (rented_out).
 */
export default async function orderFulfilledRentals({
  event: { data },
  container,
}: SubscriberArgs<{ id?: string; order_id?: string }>) {
  const orderId = data.order_id || data.id
  if (!orderId) {
    return
  }

  const rentalService: RentalModuleService = container.resolve(RENTAL_MODULE)
  const bookings = await rentalService.listRentalBookings({
    order_id: orderId,
    rental_status: ["reserved"],
  })

  for (const booking of bookings) {
    await startRentalWorkflow(container).run({
      input: { bookingId: booking.id, conditionOnPickup: "Dispatched" },
    })

    const to = await orderEmail(container, orderId)
    await notifyRental(container, {
      to,
      event: "rental.rented_out",
      subject: "Your rental is on the way",
      body: `Booking ${booking.id} is now rented out. Return by ${booking.end_date}.`,
      data: { booking_id: booking.id, order_id: orderId },
    })
  }
}

export const config: SubscriberConfig = {
  event: "order.fulfillment_created",
}
