import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { RENTAL_MODULE } from "../../../../modules/rental"
import { APPOINTMENT_MODULE } from "../../../../modules/appointment"
import { EVENT_MODULE } from "../../../../modules/event"
import RentalModuleService from "../../../../modules/rental/service"
import AppointmentModuleService from "../../../../modules/appointment/service"
import EventModuleService from "../../../../modules/event/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const rentalService: RentalModuleService = req.scope.resolve(RENTAL_MODULE)
    const appointmentService: AppointmentModuleService =
      req.scope.resolve(APPOINTMENT_MODULE)
    const eventService: EventModuleService = req.scope.resolve(EVENT_MODULE)
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    const [rentalItems, rentalBookings] = await Promise.all([
      rentalService.listRentalItems({}),
      rentalService.listRentalBookings({}),
    ])

    const [slots, appointments] = await Promise.all([
      appointmentService.listServiceSlots({}),
      appointmentService.listAppointmentBookings({}),
    ])

    const [events, tickets] = await Promise.all([
      eventService.listEvents({}),
      eventService.listEventTickets({}),
    ])

    // Query graph check for products and orders
    let productsCount = 0
    let ordersCount = 0
    try {
      const { data: products } = await query.graph({
        entity: "product",
        fields: ["id", "title"],
      })
      productsCount = products.length
    } catch (_) {}

    try {
      const { data: orders } = await query.graph({
        entity: "order",
        fields: ["id"],
      })
      ordersCount = orders.length
    } catch (_) {}

    res.json({
      status: "online",
      version: "2.20.1",
      architecture:
        "Medusa v2 cart-native verticals: retail + rental + appointment in one checkout",
      cart: {
        addAppointment: "POST /store/carts/:id/line-items/appointment",
        addRental: "POST /store/carts/:id/line-items/rental",
        complete: "POST /store/carts/:id/complete",
        payment: process.env.STRIPE_API_KEY
          ? "stripe (manual capture)"
          : "pp_system_default (set STRIPE_API_KEY for authorize-only Stripe)",
      },
      modules: {
        nativeCommerce: {
          productsCount,
          ordersCount,
        },
        rentals: {
          itemsCount: rentalItems.length,
          activeBookingsCount: rentalBookings.filter(
            (b) => b.rental_status === "active" || b.rental_status === "reserved"
          ).length,
        },
        appointments: {
          availableSlotsCount: slots.filter(
            (s) => Number(s.booked_count) < Number(s.max_capacity)
          ).length,
          totalAppointmentsCount: appointments.length,
        },
        events: {
          eventsCount: events.length,
          ticketsIssuedCount: tickets.length,
        },
      },
    })
  } catch (err: any) {
    res.status(500).json({
      status: "error",
      message: err.message || "Failed to retrieve summary",
    })
  }
}
