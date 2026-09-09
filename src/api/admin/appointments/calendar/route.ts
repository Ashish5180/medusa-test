import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { fail, parseBody } from "../../../_helpers/http"
import { APPOINTMENT_MODULE } from "../../../../modules/appointment"
import AppointmentModuleService from "../../../../modules/appointment/service"
import createServiceSlotWorkflow from "../../../../workflows/appointments/create-service-slot"

const createSlotSchema = z.object({
  service_id: z.string().optional(),
  product_id: z.string().optional(),
  resource_name: z.string().min(1, "resource_name is required"),
  slot_start: z.string().min(1, "slot_start is required"),
  slot_end: z.string().min(1, "slot_end is required"),
  max_capacity: z.coerce.number().int().positive().optional(),
})

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
  const body = parseBody(createSlotSchema, req.body, res)
  if (!body) {
    return
  }

  const slotStart = new Date(body.slot_start)
  const slotEnd = new Date(body.slot_end)
  if (Number.isNaN(slotStart.getTime()) || Number.isNaN(slotEnd.getTime()) || slotEnd <= slotStart) {
    res.status(400).json({ message: "slot_end must be after slot_start." })
    return
  }

  const serviceId = body.product_id || body.service_id || "srv_general"

  try {
    const { result } = await createServiceSlotWorkflow(req.scope).run({
      input: {
        serviceId,
        productId: body.product_id || body.service_id,
        resourceName: body.resource_name,
        slotStart: body.slot_start,
        slotEnd: body.slot_end,
        maxCapacity: body.max_capacity || 1,
      },
    })

    res.json({ success: true, slot: result })
  } catch (err) {
    fail(res, err, "Failed to create slot")
  }
}
