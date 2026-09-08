import { MedusaService, MedusaError } from "@medusajs/framework/utils"
import crypto from "crypto"
import Event from "./models/event"
import EventTicket from "./models/event-ticket"

class EventModuleService extends MedusaService({
  Event,
  EventTicket,
}) {
  async getEventRemainingCapacity(eventId: string) {
    const event = await this.retrieveEvent(eventId)
    const remaining = Math.max(0, Number(event.total_capacity) - Number(event.tickets_issued))
    return {
      eventId: event.id,
      title: event.title,
      totalCapacity: Number(event.total_capacity),
      ticketsIssued: Number(event.tickets_issued),
      remainingCapacity: remaining,
      isSoldOut: remaining === 0,
    }
  }

  async issueTicket(
    eventId: string,
    ticketData: {
      order_id?: string
      order_line_item_id?: string
      ticket_tier?: string
      attendee_name?: string
      attendee_email?: string
    }
  ) {
    const event = await this.retrieveEvent(eventId)
    const issued = Number(event.tickets_issued)
    const capacity = Number(event.total_capacity)

    if (issued >= capacity) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Event "${event.title}" is already sold out.`
      )
    }

    const uniqueHash = crypto.randomBytes(4).toString("hex").toUpperCase()
    const ticketCode = `TCK-${eventId.slice(-4).toUpperCase()}-${uniqueHash}`

    const ticket = await this.createEventTickets({
      event_id: eventId,
      order_id: ticketData.order_id,
      order_line_item_id: ticketData.order_line_item_id,
      ticket_code: ticketCode,
      ticket_tier: ticketData.ticket_tier || "General Admission",
      attendee_name: ticketData.attendee_name,
      attendee_email: ticketData.attendee_email,
      is_checked_in: false,
      status: "valid",
    })

    const newIssuedCount = issued + 1
    await this.updateEvents({
      id: eventId,
      tickets_issued: newIssuedCount,
      status: newIssuedCount >= capacity ? "sold_out" : event.status,
    })

    return ticket
  }

  async validateTicketCheckin(ticketCode: string) {
    const tickets = await this.listEventTickets({
      ticket_code: ticketCode,
    })

    if (!tickets.length) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Invalid ticket code: ${ticketCode}`
      )
    }

    const ticket = tickets[0]
    if (ticket.status !== "valid") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Ticket is not valid (status: ${ticket.status})`
      )
    }
    if (ticket.is_checked_in) {
      return {
        success: false,
        alreadyCheckedIn: true,
        checkedInAt: ticket.checked_in_at,
        ticket,
        message: "Warning: Ticket has already been scanned/checked in!",
      }
    }

    const now = new Date()
    const updated = await this.updateEventTickets({
      id: ticket.id,
      is_checked_in: true,
      checked_in_at: now,
      status: "used",
    })

    return {
      success: true,
      alreadyCheckedIn: false,
      checkedInAt: now,
      ticket: updated,
      message: "Check-in successful! Welcome to the event.",
    }
  }

  async cancelTicket(ticketId: string) {
    const ticket = await this.retrieveEventTicket(ticketId)
    if (ticket.status === "cancelled") {
      return ticket
    }

    const updated = await this.updateEventTickets({
      id: ticketId,
      status: "cancelled",
    })

    if (ticket.status === "valid") {
      const event = await this.retrieveEvent(ticket.event_id)
      const nextIssued = Math.max(0, Number(event.tickets_issued) - 1)
      await this.updateEvents({
        id: event.id,
        tickets_issued: nextIssued,
        status: event.status === "sold_out" ? "published" : event.status,
      })
    }

    return updated
  }
}

export default EventModuleService
