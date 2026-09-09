import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { fail, parseBody } from "../../../_helpers/http"
import reserveAppointmentWorkflow from "../../../../workflows/appointments/reserve-appointment"

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

  try {
    const { result } = await reserveAppointmentWorkflow(req.scope).run({
      input: {
        slotId: body.slotId,
        customerName: body.customerName,
        customerEmail: body.customerEmail || undefined,
        customerPhone: body.customerPhone,
        notes: body.notes,
        status: "confirmed",
      },
    })

    res.json({ success: true, booking: result })
  } catch (err) {
    fail(res, err, "Failed to book slot")
  }
}
