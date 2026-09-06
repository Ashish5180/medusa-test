import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { APPOINTMENT_MODULE } from "../../../../modules/appointment"
import AppointmentModuleService from "../../../../modules/appointment/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const appointmentService: AppointmentModuleService =
    req.scope.resolve(APPOINTMENT_MODULE)

  const body = req.body as {
    slotId: string
    customerName: string
    customerEmail?: string
    customerPhone?: string
    notes?: string
  }

  if (!body.slotId || !body.customerName) {
    res.status(400).json({ message: "slotId and customerName are required." })
    return
  }

  try {
    const booking = await appointmentService.reserveSlot(body.slotId, {
      customer_name: body.customerName,
      customer_email: body.customerEmail,
      customer_phone: body.customerPhone,
      notes: body.notes,
    })

    res.json({ success: true, booking })
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || "Failed to book slot" })
  }
}
