import { MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { addToCartWorkflow } from "@medusajs/medusa/core-flows"
import { VERTICAL } from "../../lib/commerce"
import { firstVariantId, getProductForEvent } from "../../lib/vertical-catalog"
import { EVENT_MODULE } from "../../modules/event"
import EventModuleService from "../../modules/event/service"

export type AddEventToCartInput = {
  cartId: string
  eventId: string
  ticketTier?: string
  attendeeName?: string
  attendeeEmail?: string
  quantity?: number
}

const addEventLineStep = createStep(
  "add-event-line",
  async (input: AddEventToCartInput, { container }) => {
    const eventService: EventModuleService = container.resolve(EVENT_MODULE)
    const capacity = await eventService.getEventRemainingCapacity(input.eventId)
    const quantity = Math.max(1, Number(input.quantity || 1))

    if (capacity.remainingCapacity < quantity) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        capacity.isSoldOut
          ? `Event "${capacity.title}" is sold out.`
          : `Only ${capacity.remainingCapacity} ticket(s) left for "${capacity.title}".`
      )
    }

    const event = await eventService.retrieveEvent(input.eventId)
    const product = await getProductForEvent(container, input.eventId)
    const variantId = firstVariantId(product)
    const ticketTier = input.ticketTier || "General Admission"

    const query = container.resolve("query") as {
      graph: (args: Record<string, unknown>) => Promise<{ data: any[] }>
    }
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: ["id", "items.id", "items.quantity", "items.metadata"],
      filters: { id: input.cartId },
    })
    const alreadyInCart = ((carts[0]?.items || []) as Array<{
      quantity?: number
      metadata?: Record<string, unknown>
    }>).reduce((sum, item) => {
      if (item.metadata?.event_id === event.id && item.metadata?.vertical === VERTICAL.EVENT) {
        return sum + Math.max(1, Number(item.quantity || 1))
      }
      return sum
    }, 0)
    if (capacity.remainingCapacity < quantity + alreadyInCart) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Only ${capacity.remainingCapacity} ticket(s) left for "${capacity.title}".`
      )
    }

    await addToCartWorkflow(container).run({
      input: {
        cart_id: input.cartId,
        items: [
          {
            variant_id: variantId,
            quantity,
            requires_shipping: false,
            title: `${event.title} · ${ticketTier}`,
            metadata: {
              vertical: VERTICAL.EVENT,
              type: "event",
              event_id: event.id,
              seating_tier_id: "ga",
              ticket_type: ticketTier,
              attendee_name: input.attendeeName,
              attendee_email: input.attendeeEmail,
            },
          },
        ],
      },
    })

    const { data } = await query.graph({
      entity: "cart",
      fields: ["id", "items.id", "items.metadata"],
      filters: { id: input.cartId },
    })
    const line = (data[0]?.items || []).find(
      (item: { metadata?: Record<string, unknown> }) =>
        item.metadata?.event_id === event.id && item.metadata?.vertical === VERTICAL.EVENT
    )
    if (!line?.id) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Event ticket was not added to the cart."
      )
    }

    return new StepResponse({
      lineItemId: line.id,
      productId: product.id,
      remainingCapacity: capacity.remainingCapacity - quantity,
    })
  }
)

export const addEventToCartWorkflow = createWorkflow(
  "add-event-to-cart",
  (input: AddEventToCartInput) => {
    const line = addEventLineStep(input)
    return new WorkflowResponse(line)
  }
)

export default addEventToCartWorkflow
