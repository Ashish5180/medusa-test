import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import reserveAppointmentWorkflow, {
  ReserveAppointmentInput,
} from "../../../../workflows/appointments/reserve-appointment"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as ReserveAppointmentInput

  if (!body.slotId) {
    res.status(400).json({
      message: "slotId is required.",
    })
    return
  }

  try {
    const { result } = await reserveAppointmentWorkflow(req.scope).run({
      input: body,
    })

    res.status(201).json({
      success: true,
      booking: result,
    })
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || "Failed to reserve appointment",
    })
  }
}
