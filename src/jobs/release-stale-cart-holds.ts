import { MedusaContainer } from "@medusajs/framework"
import { STALE_CART_HOLD_HOURS } from "../lib/commerce"
import { releaseRentalInventory } from "../lib/rental-inventory"
import { APPOINTMENT_MODULE } from "../modules/appointment"
import AppointmentModuleService from "../modules/appointment/service"
import { RENTAL_MODULE } from "../modules/rental"
import RentalModuleService from "../modules/rental/service"

export default async function releaseStaleCartHolds(container: MedusaContainer) {
  const cutoff = new Date(Date.now() - STALE_CART_HOLD_HOURS * 60 * 60 * 1000)
  const appointmentService: AppointmentModuleService =
    container.resolve(APPOINTMENT_MODULE)
  const rentalService: RentalModuleService = container.resolve(RENTAL_MODULE)

  const staleAppointments = await appointmentService.listAppointmentBookings({
    status: ["pending"],
  })
  for (const booking of staleAppointments) {
    if (booking.order_id || !booking.cart_id) continue
    if (new Date(booking.created_at).getTime() > cutoff.getTime()) continue
    await appointmentService.cancelAppointment(booking.id)
  }

  const staleRentals = await rentalService.listRentalBookings({
    rental_status: ["reserved"],
  })
  for (const booking of staleRentals) {
    if (booking.order_id || !booking.cart_id) continue
    if (new Date(booking.created_at).getTime() > cutoff.getTime()) continue
    await releaseRentalInventory(container, booking.id)
    await rentalService.cancelRental(booking.id)
  }
}

export const config = {
  name: "release-stale-cart-holds",
  schedule: "0 * * * *",
}
