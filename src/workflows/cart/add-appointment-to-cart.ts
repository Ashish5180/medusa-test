import { MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { addToCartWorkflow } from "@medusajs/medusa/core-flows"
import { VERTICAL } from "../../lib/commerce"
import { firstVariantId, getProductForAppointmentSlot } from "../../lib/vertical-catalog"
import { APPOINTMENT_MODULE } from "../../modules/appointment"
import AppointmentModuleService from "../../modules/appointment/service"
import reserveAppointmentWorkflow from "../appointments/reserve-appointment"

export type AddAppointmentToCartInput = {
  cartId: string
  slotId: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  customerId?: string
  notes?: string
}

const addAppointmentLineStep = createStep(
  "add-appointment-line-to-cart",
  async (
    input: AddAppointmentToCartInput & { bookingId: string },
    { container }
  ) => {
    const appointmentService: AppointmentModuleService =
      container.resolve(APPOINTMENT_MODULE)
    const slot = await appointmentService.retrieveServiceSlot(input.slotId)
    const product = await getProductForAppointmentSlot(container, slot)
    const variantId = firstVariantId(product)

    await addToCartWorkflow(container).run({
      input: {
        cart_id: input.cartId,
        items: [
          {
            variant_id: variantId,
            quantity: 1,
            requires_shipping: false,
            metadata: {
              vertical: VERTICAL.APPOINTMENT,
              slot_id: slot.id,
              booking_id: input.bookingId,
              slot_start: slot.slot_start,
              slot_end: slot.slot_end,
            },
          },
        ],
      },
    })

    const query = container.resolve("query") as {
      graph: (args: Record<string, unknown>) => Promise<{ data: any[] }>
    }
    const { data } = await query.graph({
      entity: "cart",
      fields: ["id", "items.id", "items.metadata", "items.unit_price"],
      filters: { id: input.cartId },
    })
    const line = (data[0]?.items || []).find(
      (item: { metadata?: Record<string, unknown> }) =>
        item.metadata?.booking_id === input.bookingId
    )
    if (!line?.id) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Appointment was reserved but the cart line item was not created."
      )
    }

    await appointmentService.updateAppointmentBookings({
      id: input.bookingId,
      line_item_id: line.id,
    })

    return new StepResponse({
      lineItemId: line.id,
      unitPrice: line.unit_price,
      productId: product.id,
    })
  }
)

export const addAppointmentToCartWorkflow = createWorkflow(
  "add-appointment-to-cart",
  (input: AddAppointmentToCartInput) => {
    const booking = reserveAppointmentWorkflow.runAsStep({
      input: {
        slotId: input.slotId,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        customerId: input.customerId,
        cartId: input.cartId,
        notes: input.notes,
        status: "pending",
      },
    })

    const lineInput = transform({ input, booking }, (data) => ({
      cartId: data.input.cartId,
      slotId: data.input.slotId,
      customerName: data.input.customerName,
      customerEmail: data.input.customerEmail,
      customerPhone: data.input.customerPhone,
      customerId: data.input.customerId,
      notes: data.input.notes,
      bookingId: data.booking.id,
    }))

    const line = addAppointmentLineStep(lineInput)

    return new WorkflowResponse({
      booking,
      lineItemId: line.lineItemId,
      unitPrice: line.unitPrice,
      productId: line.productId,
    })
  }
)

export default addAppointmentToCartWorkflow
