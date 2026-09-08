import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { fail, parseBody } from "../../../../_helpers/http"
import { APPOINTMENT_MODULE } from "../../../../../modules/appointment"
import AppointmentModuleService from "../../../../../modules/appointment/service"

const updateSlotSchema = z.object({
  resource_name: z.string().optional(),
  slot_start: z.string().optional(),
  slot_end: z.string().optional(),
  max_capacity: z.coerce.number().int().positive().optional(),
  is_blocked: z.boolean().optional(),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = parseBody(updateSlotSchema, req.body, res)
  if (!body) {
    return
  }

  const appointmentService: AppointmentModuleService =
    req.scope.resolve(APPOINTMENT_MODULE)

  try {
    const slot = await appointmentService.updateServiceSlots({
      id: req.params.id,
      ...(body.resource_name !== undefined ? { resource_name: body.resource_name } : {}),
      ...(body.slot_start ? { slot_start: new Date(body.slot_start) } : {}),
      ...(body.slot_end ? { slot_end: new Date(body.slot_end) } : {}),
      ...(body.max_capacity !== undefined ? { max_capacity: body.max_capacity } : {}),
      ...(body.is_blocked !== undefined ? { is_blocked: body.is_blocked } : {}),
    })

    res.json({ success: true, slot })
  } catch (err) {
    fail(res, err, "Failed to update slot")
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const appointmentService: AppointmentModuleService =
    req.scope.resolve(APPOINTMENT_MODULE)

  try {
    const slot = await appointmentService.retrieveServiceSlot(req.params.id)
    if (Number(slot.booked_count) > 0) {
      res.status(400).json({
        message: "Cannot delete a slot that already has bookings. Cancel the bookings first.",
      })
      return
    }

    await appointmentService.deleteServiceSlots(req.params.id)
    res.json({ success: true, id: req.params.id, deleted: true })
  } catch (err) {
    fail(res, err, "Failed to delete slot")
  }
}
