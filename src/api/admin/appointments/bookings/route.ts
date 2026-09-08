import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { fail, parseBody } from "../../../_helpers/http"
import { APPOINTMENT_MODULE } from "../../../../modules/appointment"
import AppointmentModuleService from "../../../../modules/appointment/service"

const createBookingSchema = z.object({
  slotId: z.string().min(1, "slotId is required"),
  customerName: z.string().min(1, "customerName is required"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = parseBody(createBookingSchema, req.body, res)
  if (!body) {
    return
  }

  const appointmentService: AppointmentModuleService =
    req.scope.resolve(APPOINTMENT_MODULE)

  try {
    const booking = await appointmentService.reserveSlot(body.slotId, {
      customer_name: body.customerName,
      customer_email: body.customerEmail || undefined,
      customer_phone: body.customerPhone,
      notes: body.notes,
    })

    res.json({ success: true, booking })
  } catch (err) {
    fail(res, err, "Failed to book slot")
  }
}
