import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import AppointmentBooking from "./models/appointment-booking"
import ServiceSlot from "./models/service-slot"

class AppointmentModuleService extends MedusaService({
  ServiceSlot,
  AppointmentBooking,
}) {
  async getAvailableSlots(serviceId: string, fromDate?: Date, toDate?: Date) {
    const filters: Record<string, unknown> = {
      is_blocked: false,
    }

    if (fromDate || toDate) {
      const slotStart: Record<string, Date> = {}
      if (fromDate) slotStart.$gte = fromDate
      if (toDate) slotStart.$lte = toDate
      filters.slot_start = slotStart
    }

    const slots = await this.listServiceSlots(filters)
    return slots.filter((slot) => {
      if (
        serviceId &&
        slot.service_id !== serviceId &&
        slot.product_id !== serviceId
      ) {
        return false
      }
      return Number(slot.booked_count) < Number(slot.max_capacity)
    })
  }

  async reserveSlot(
    slotId: string,
    bookingData: {
      order_id?: string
      customer_id?: string
      cart_id?: string
      line_item_id?: string
      customer_name?: string
      customer_email?: string
      customer_phone?: string
      notes?: string
      status?: "pending" | "confirmed"
    }
  ) {
    const slot = await this.retrieveServiceSlot(slotId)
    if (slot.is_blocked) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "This slot is blocked and unavailable."
      )
    }
    if (Number(slot.booked_count) >= Number(slot.max_capacity)) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "This appointment slot is already fully booked."
      )
    }

    const booking = await this.createAppointmentBookings({
      slot_id: slotId,
      order_id: bookingData.order_id,
      customer_id: bookingData.customer_id,
      cart_id: bookingData.cart_id,
      line_item_id: bookingData.line_item_id,
      customer_name: bookingData.customer_name,
      customer_email: bookingData.customer_email,
      customer_phone: bookingData.customer_phone,
      notes: bookingData.notes,
      status: bookingData.status || "pending",
      vendor_id: slot.vendor_id || null,
    })

    await this.updateServiceSlots({
      id: slotId,
      booked_count: Number(slot.booked_count) + 1,
    })

    return booking
  }

  async confirmAppointment(bookingId: string, extras?: { order_id?: string; customer_id?: string }) {
    const booking = await this.retrieveAppointmentBooking(bookingId)
    if (booking.status === "cancelled") {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Cannot confirm a cancelled appointment.")
    }
    if (booking.status === "completed" || booking.status === "no_show") {
      return booking
    }

    return this.updateAppointmentBookings({
      id: bookingId,
      status: "confirmed",
      order_id: extras?.order_id ?? booking.order_id,
      customer_id: extras?.customer_id ?? booking.customer_id,
    })
  }

  async completeAppointment(bookingId: string) {
    const booking = await this.retrieveAppointmentBooking(bookingId)
    if (booking.status === "cancelled") {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Cannot complete a cancelled appointment.")
    }

    return this.updateAppointmentBookings({
      id: bookingId,
      status: "completed",
    })
  }

  async markNoShow(bookingId: string) {
    const booking = await this.retrieveAppointmentBooking(bookingId)
    if (booking.status === "cancelled") {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Cannot mark a cancelled appointment as no-show.")
    }

    return this.updateAppointmentBookings({
      id: bookingId,
      status: "no_show",
    })
  }

  async cancelAppointment(bookingId: string) {
    const booking = await this.retrieveAppointmentBooking(bookingId)
    if (booking.status === "cancelled") {
      return booking
    }

    const updated = await this.updateAppointmentBookings({
      id: bookingId,
      status: "cancelled",
    })

    const slot = await this.retrieveServiceSlot(booking.slot_id)
    await this.updateServiceSlots({
      id: slot.id,
      booked_count: Math.max(0, Number(slot.booked_count) - 1),
    })

    return updated
  }
}

export default AppointmentModuleService
