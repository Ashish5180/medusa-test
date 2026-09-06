import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { APPOINTMENT_MODULE } from "../../../../modules/appointment"
import AppointmentModuleService from "../../../../modules/appointment/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const appointmentService: AppointmentModuleService =
    req.scope.resolve(APPOINTMENT_MODULE)

  const bookings = await appointmentService.listAppointmentBookings({}, { order: { created_at: "DESC" } })
  const slots = await appointmentService.listServiceSlots({}, { order: { slot_start: "ASC" } })

  res.json({
    bookings,
    slots,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const appointmentService: AppointmentModuleService =
    req.scope.resolve(APPOINTMENT_MODULE)

  const body = req.body as {
    service_id?: string
    resource_name: string
    slot_start: string
    slot_end: string
    max_capacity?: number
  }

  if (!body.resource_name || !body.slot_start || !body.slot_end) {
    res.status(400).json({ message: "resource_name, slot_start, and slot_end are required." })
    return
  }

  try {
    const slot = await appointmentService.createServiceSlots({
      service_id: body.service_id || "srv_general",
      resource_name: body.resource_name,
      slot_start: new Date(body.slot_start),
      slot_end: new Date(body.slot_end),
      max_capacity: Number(body.max_capacity) || 1,
      booked_count: 0,
      is_blocked: false,
    })

    res.json({ success: true, slot })
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || "Failed to create slot" })
  }
}
