import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { ensureAppointmentCatalogProduct } from "../../lib/vertical-catalog"
import { APPOINTMENT_MODULE } from "../../modules/appointment"
import AppointmentModuleService from "../../modules/appointment/service"

export type CreateServiceSlotInput = {
  serviceId: string
  productId?: string
  resourceId?: string
  resourceName?: string
  slotStart: string
  slotEnd: string
  maxCapacity?: number
  vendorId?: string
}

export const createServiceSlotStep = createStep(
  "create-service-slot",
  async (input: CreateServiceSlotInput, { container }) => {
    const appointmentService: AppointmentModuleService =
      container.resolve(APPOINTMENT_MODULE)
    const productId = input.productId || input.serviceId

    const slot = await appointmentService.createServiceSlots({
      service_id: productId,
      product_id: productId,
      resource_id: input.resourceId || "default-provider",
      resource_name: input.resourceName || "General Staff",
      slot_start: new Date(input.slotStart),
      slot_end: new Date(input.slotEnd),
      max_capacity: input.maxCapacity || 1,
      booked_count: 0,
      is_blocked: false,
      vendor_id: input.vendorId || null,
    })

    const catalog = await ensureAppointmentCatalogProduct(container, slot)
    if (catalog.id !== slot.product_id) {
      await appointmentService.updateServiceSlots({
        id: slot.id,
        product_id: catalog.id,
        service_id: catalog.id,
      })
    }

    return new StepResponse(
      { ...slot, product_id: catalog.id, service_id: catalog.id },
      { slotId: slot.id, productId: catalog.id }
    )
  },
  async (compensate: { slotId?: string; productId?: string } | undefined, { container }) => {
    if (!compensate?.slotId) return
    const appointmentService: AppointmentModuleService =
      container.resolve(APPOINTMENT_MODULE)
    if (compensate.productId) {
      const link = container.resolve(ContainerRegistrationKeys.LINK)
      await link.dismiss({
        [Modules.PRODUCT]: { product_id: compensate.productId },
        [APPOINTMENT_MODULE]: { service_slot_id: compensate.slotId },
      })
    }
    await appointmentService.deleteServiceSlots([compensate.slotId])
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
