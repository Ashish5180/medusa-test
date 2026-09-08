import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { fail, parseBody } from "../../../../_helpers/http"
import { APPOINTMENT_MODULE } from "../../../../../modules/appointment"
import AppointmentModuleService from "../../../../../modules/appointment/service"

const updateBookingSchema = z.object({
  customer_name: z.string().optional(),
  customer_email: z.string().email().optional().or(z.literal("")),
  customer_phone: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]).optional(),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = parseBody(updateBookingSchema, req.body, res)
  if (!body) {
    return
  }

  const appointmentService: AppointmentModuleService =
    req.scope.resolve(APPOINTMENT_MODULE)

  try {
    if (body.status === "cancelled") {
      const booking = await appointmentService.cancelAppointment(req.params.id)
      res.json({ success: true, booking })
      return
    }

    const booking = await appointmentService.updateAppointmentBookings({
      id: req.params.id,
      ...(body.customer_name !== undefined ? { customer_name: body.customer_name } : {}),
      ...(body.customer_email !== undefined
        ? { customer_email: body.customer_email || undefined }
        : {}),
      ...(body.customer_phone !== undefined ? { customer_phone: body.customer_phone } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.status ? { status: body.status } : {}),
    })

    res.json({ success: true, booking })
  } catch (err) {
    fail(res, err, "Failed to update booking")
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const appointmentService: AppointmentModuleService =
    req.scope.resolve(APPOINTMENT_MODULE)

  try {
    await appointmentService.cancelAppointment(req.params.id)
    await appointmentService.deleteAppointmentBookings(req.params.id)
    res.json({ success: true, id: req.params.id, deleted: true })
  } catch (err) {
    fail(res, err, "Failed to delete booking")
  }
}
