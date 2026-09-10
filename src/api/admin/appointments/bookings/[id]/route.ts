import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { fail, parseBody } from "../../../../_helpers/http"
import cancelAppointmentWorkflow from "../../../../../workflows/appointments/cancel-appointment"
import completeAppointmentWorkflow from "../../../../../workflows/appointments/complete-appointment"
import noShowAppointmentWorkflow from "../../../../../workflows/appointments/no-show-appointment"
import { APPOINTMENT_MODULE } from "../../../../../modules/appointment"
import AppointmentModuleService from "../../../../../modules/appointment/service"

const updateBookingSchema = z.object({
  customer_name: z.string().optional(),
  customer_email: z.string().email().optional().or(z.literal("")),
  customer_phone: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]).optional(),
  force: z.boolean().optional(),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = parseBody(updateBookingSchema, req.body, res)
  if (!body) {
    return
  }

  try {
    if (body.status === "cancelled") {
      const { result } = await cancelAppointmentWorkflow(req.scope).run({
        input: { bookingId: req.params.id, force: body.force },
      })
      res.json({ success: true, booking: result.booking })
      return
    }

    if (body.status === "completed") {
      const { result } = await completeAppointmentWorkflow(req.scope).run({
        input: { bookingId: req.params.id },
      })
      res.json({ success: true, booking: result })
      return
    }

    if (body.status === "no_show") {
      const { result } = await noShowAppointmentWorkflow(req.scope).run({
        input: { bookingId: req.params.id },
      })
      res.json({ success: true, booking: result })
      return
    }

    const appointmentService: AppointmentModuleService =
      req.scope.resolve(APPOINTMENT_MODULE)
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
  try {
    const { result } = await cancelAppointmentWorkflow(req.scope).run({
      input: { bookingId: req.params.id, force: true },
    })
    const appointmentService: AppointmentModuleService =
      req.scope.resolve(APPOINTMENT_MODULE)
    await appointmentService.deleteAppointmentBookings(req.params.id)
    res.json({ success: true, id: req.params.id, deleted: true, booking: result.booking })
  } catch (err) {
    fail(res, err, "Failed to delete booking")
  }
}
