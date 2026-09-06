import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { APPOINTMENT_MODULE } from "../../../../modules/appointment"
import AppointmentModuleService from "../../../../modules/appointment/service"
import createServiceSlotWorkflow from "../../../../workflows/appointments/create-service-slot"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const appointmentService: AppointmentModuleService =
    req.scope.resolve(APPOINTMENT_MODULE)

  const serviceId = req.query.service_id as string
  const fromDate = req.query.from_date
    ? new Date(req.query.from_date as string)
    : undefined
  const toDate = req.query.to_date
    ? new Date(req.query.to_date as string)
    : undefined

  if (!serviceId) {
    const allSlots = await appointmentService.listServiceSlots({
      is_blocked: false,
    })
    res.json({ slots: allSlots })
    return
  }

  const availableSlots = await appointmentService.getAvailableSlots(
    serviceId,
    fromDate,
    toDate
  )

  res.json({
    slots: availableSlots,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as {
    serviceId: string
    resourceId?: string
    resourceName?: string
    slotStart: string
    slotEnd: string
    maxCapacity?: number
  }

  if (!body.serviceId || !body.slotStart || !body.slotEnd) {
    res.status(400).json({
      message: "serviceId, slotStart, and slotEnd are required.",
    })
    return
  }

  try {
    const { result } = await createServiceSlotWorkflow(req.scope).run({
      input: body,
    })

    res.status(201).json({
      success: true,
      slot: result,
    })
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || "Failed to create service slot",
    })
  }
}
