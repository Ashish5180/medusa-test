import { MedusaService, MedusaError } from "@medusajs/framework/utils"
import ServiceSlot from "./models/service-slot"
import AppointmentBooking from "./models/appointment-booking"

class AppointmentModuleService extends MedusaService({
  ServiceSlot,
  AppointmentBooking,
}) {
  async getAvailableSlots(serviceId: string, fromDate?: Date, toDate?: Date) {
    const filters: any = {
      service_id: serviceId,
      is_blocked: false,
    }

    if (fromDate || toDate) {
      filters.slot_start = {}
      if (fromDate) filters.slot_start.$gte = fromDate
      if (toDate) filters.slot_start.$lte = toDate
    }

    const slots = await this.listServiceSlots(filters)
    return slots.filter((slot) => Number(slot.booked_count) < Number(slot.max_capacity))
  }

  async reserveSlot(
    slotId: string,
    bookingData: {
      order_id?: string
      customer_id?: string
      customer_name?: string
      customer_email?: string
      customer_phone?: string
      notes?: string
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
      customer_name: bookingData.customer_name,
      customer_email: bookingData.customer_email,
      customer_phone: bookingData.customer_phone,
      notes: bookingData.notes,
      status: "confirmed",
    })

    await this.updateServiceSlots({
      id: slotId,
      booked_count: Number(slot.booked_count) + 1,
    })

    return booking
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
