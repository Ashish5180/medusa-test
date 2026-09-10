import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { APPOINTMENT_MODULE } from "../modules/appointment"
import AppointmentModuleService from "../modules/appointment/service"
import { releaseRentalInventory } from "../lib/rental-inventory"
import { RENTAL_MODULE } from "../modules/rental"
import RentalModuleService from "../modules/rental/service"

export default async function cartUpdatedReleaseHolds({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const cartId = data.id
  if (!cartId) return

  const query = container.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (args: Record<string, unknown>) => Promise<{ data: any[] }>
  }
  const { data: carts } = await query.graph({
    entity: "cart",
    fields: ["id", "items.id", "items.metadata", "completed_at"],
    filters: { id: cartId },
  })
  const cart = carts[0]
  if (!cart || cart.completed_at) {
    return
  }

  const liveBookingIds = new Set(
    (cart.items || [])
      .map((item: { metadata?: Record<string, unknown> }) => item.metadata?.booking_id)
      .filter((id: unknown): id is string => typeof id === "string")
  )

  const appointmentService: AppointmentModuleService =
    container.resolve(APPOINTMENT_MODULE)
  const pending = await appointmentService.listAppointmentBookings({
    cart_id: cartId,
    status: ["pending"],
  })
  for (const booking of pending) {
    if (!liveBookingIds.has(booking.id)) {
      await appointmentService.cancelAppointment(booking.id)
    }
  }

  const rentalService: RentalModuleService = container.resolve(RENTAL_MODULE)
  const reserved = await rentalService.listRentalBookings({
    cart_id: cartId,
    rental_status: ["reserved"],
    order_id: null,
  })
  for (const booking of reserved) {
    if (!liveBookingIds.has(booking.id)) {
      await releaseRentalInventory(container, booking.id)
      await rentalService.cancelRental(booking.id)
    }
  }
}

export const config: SubscriberConfig = {
  event: "cart.updated",
}
