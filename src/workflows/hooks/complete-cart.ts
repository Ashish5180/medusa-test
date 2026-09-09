import { MedusaError } from "@medusajs/framework/utils"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { isAppointmentLine, isEventLine, isRentalFeeLine } from "../../lib/commerce"
import { APPOINTMENT_MODULE } from "../../modules/appointment"
import AppointmentModuleService from "../../modules/appointment/service"
import { EVENT_MODULE } from "../../modules/event"
import EventModuleService from "../../modules/event/service"
import { RENTAL_MODULE } from "../../modules/rental"
import RentalModuleService from "../../modules/rental/service"

completeCartWorkflow.hooks.validate(async ({ cart }, { container }) => {
  const items = (cart.items || []) as Array<{
    id: string
    quantity?: number
    metadata?: Record<string, unknown> | null
  }>

  const eventQty = new Map<string, number>()
  for (const item of items) {
    if (isEventLine(item.metadata) && typeof item.metadata?.event_id === "string") {
      const eventId = item.metadata.event_id
      eventQty.set(eventId, (eventQty.get(eventId) || 0) + Math.max(1, Number(item.quantity || 1)))
    }
  }

  const appointmentService: AppointmentModuleService =
    container.resolve(APPOINTMENT_MODULE)
  const rentalService: RentalModuleService = container.resolve(RENTAL_MODULE)
  const eventService: EventModuleService = container.resolve(EVENT_MODULE)

  for (const item of items) {
    if (isEventLine(item.metadata)) {
      const eventId = item.metadata?.event_id
      if (typeof eventId !== "string") {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Cart has an event ticket without an event_id."
        )
      }
      const capacity = await eventService.getEventRemainingCapacity(eventId)
      const needed = eventQty.get(eventId) || Math.max(1, Number(item.quantity || 1))
      if (capacity.remainingCapacity < needed) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          capacity.remainingCapacity < 1
            ? `Event "${capacity.title}" is sold out.`
            : `Only ${capacity.remainingCapacity} ticket(s) left for "${capacity.title}".`
        )
      }
      continue
    }

    const bookingId = item.metadata?.booking_id
    if (typeof bookingId !== "string") {
      if (isAppointmentLine(item.metadata) || isRentalFeeLine(item.metadata)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Cart has a rental or appointment line without a booking. Add it through the vertical cart routes."
        )
      }
      continue
    }

    if (isAppointmentLine(item.metadata)) {
      const booking = await appointmentService.retrieveAppointmentBooking(bookingId)
      if (booking.status === "cancelled") {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "An appointment in this cart is no longer reserved."
        )
      }
      const slot = await appointmentService.retrieveServiceSlot(booking.slot_id)
      if (slot.is_blocked) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "An appointment slot in this cart is now blocked."
        )
      }
    }

    if (isRentalFeeLine(item.metadata)) {
      const booking = await rentalService.retrieveRentalBooking(bookingId)
      if (booking.rental_status === "cancelled") {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "A rental in this cart is no longer reserved."
        )
      }
      const stillFree = await rentalService.checkAvailability(
        booking.item_id,
        new Date(booking.start_date),
        new Date(booking.end_date),
        booking.id
      )
      if (!stillFree) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          "A rental in this cart is no longer available for those dates."
        )
      }
    }
  }
})
