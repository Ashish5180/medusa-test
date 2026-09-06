import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { APPOINTMENT_MODULE } from "../../modules/appointment"
import AppointmentModuleService from "../../modules/appointment/service"

export type CreateServiceSlotInput = {
  serviceId: string
  resourceId?: string
  resourceName?: string
  slotStart: string
  slotEnd: string
  maxCapacity?: number
}

export const createServiceSlotStep = createStep(
  "create-service-slot",
  async (input: CreateServiceSlotInput, { container }) => {
    const appointmentService: AppointmentModuleService =
      container.resolve(APPOINTMENT_MODULE)

    const slot = await appointmentService.createServiceSlots({
      service_id: input.serviceId,
      resource_id: input.resourceId || "default-provider",
      resource_name: input.resourceName || "General Staff",
      slot_start: new Date(input.slotStart),
      slot_end: new Date(input.slotEnd),
      max_capacity: input.maxCapacity || 1,
      booked_count: 0,
      is_blocked: false,
    })

    return new StepResponse(slot, slot.id)
  },
  async (slotId: string | undefined, { container }) => {
    if (!slotId) return
    const appointmentService: AppointmentModuleService =
      container.resolve(APPOINTMENT_MODULE)
    await appointmentService.deleteServiceSlots([slotId])
  }
)

export const createServiceSlotWorkflow = createWorkflow(
  "create-service-slot",
  (input: CreateServiceSlotInput) => {
    const slot = createServiceSlotStep(input)
    return new WorkflowResponse(slot)
  }
)

export default createServiceSlotWorkflow
