import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createOrderWorkflow, cancelOrderWorkflow } from "@medusajs/medusa/core-flows"
import { VENDOR_MODULE } from "../../modules/vendor"
import { getVendorsForProducts } from "../../lib/marketplace"

export type SplitOrderInput = {
  orderId: string
}

type SplitResult = {
  childOrderIds: string[]
  vendorIds: string[]
  linkedParent?: boolean
  skipped?: string
}

type SplitCompensate = {
  childOrderIds: string[]
  vendorIds: string[]
  parentOrderId?: string
}

type OrderItem = {
  id: string
  product_id?: string | null
  variant_id?: string | null
  title?: string
  quantity?: number
  unit_price?: number
  metadata?: Record<string, unknown> | null
}

type ParentOrder = {
  id: string
  region_id?: string | null
  customer_id?: string | null
  sales_channel_id?: string | null
  email?: string | null
  currency_code?: string
  metadata?: Record<string, unknown> | null
  items?: OrderItem[]
}

/**
 * Groups a placed order's line items by the vendor that owns the product, then
 * creates one child order per vendor and links each child to its vendor. When
 * every item belongs to a single vendor the parent order is linked directly
 * instead, so we never create a pointless duplicate.
 */
const splitOrderStep = createStep<SplitOrderInput, SplitResult, SplitCompensate>(
  "split-order",
  async ({ orderId }, { container, context }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const link = container.resolve(ContainerRegistrationKeys.LINK)

    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "region_id",
        "customer_id",
        "sales_channel_id",
        "email",
        "currency_code",
        "metadata",
        "items.id",
        "items.product_id",
        "items.variant_id",
        "items.title",
        "items.quantity",
        "items.unit_price",
        "items.metadata",
      ],
      filters: { id: orderId },
    })

    const parentOrder = orders[0] as ParentOrder | undefined
    if (!parentOrder) {
      return new StepResponse<SplitResult, SplitCompensate>({
        childOrderIds: [],
        vendorIds: [],
        skipped: "order-not-found",
      })
    }

    // A child order must never be split again.
    if (parentOrder.metadata?.parent_order_id) {
      return new StepResponse<SplitResult, SplitCompensate>({
        childOrderIds: [],
        vendorIds: [],
        skipped: "is-child-order",
      })
    }

    const items = parentOrder.items ?? []
    const productIds = Array.from(
      new Set(items.map((item) => item.product_id).filter((id): id is string => Boolean(id)))
    )

    const owners = await getVendorsForProducts(container, productIds)

    const byVendor = new Map<string, OrderItem[]>()
    for (const item of items) {
      const vendor = item.product_id ? owners.get(item.product_id) : undefined
      if (!vendor) {
        continue
      }
      byVendor.set(vendor.id, [...(byVendor.get(vendor.id) ?? []), item])
    }

    const vendorIds = Array.from(byVendor.keys())
    if (!vendorIds.length) {
      logger.info(`Order ${orderId} has no vendor-owned items. Nothing to split.`)
      return new StepResponse<SplitResult, SplitCompensate>({
        childOrderIds: [],
        vendorIds: [],
        skipped: "no-vendor-items",
      })
    }

    // Single vendor: attribute the parent order itself, no child order needed.
    if (vendorIds.length === 1) {
      await link.create({
        [VENDOR_MODULE]: { vendor_id: vendorIds[0] },
        [Modules.ORDER]: { order_id: parentOrder.id },
      })
      logger.info(`Order ${orderId} attributed to vendor ${vendorIds[0]}.`)
      return new StepResponse<SplitResult, SplitCompensate>(
        { childOrderIds: [], vendorIds, linkedParent: true },
        { childOrderIds: [], vendorIds, parentOrderId: parentOrder.id }
      )
    }

    const childOrderIds: string[] = []

    try {
      for (const vendorId of vendorIds) {
        const vendorItems = byVendor.get(vendorId) ?? []

        const { result: childOrder } = await createOrderWorkflow(container).run({
          input: {
            region_id: parentOrder.region_id ?? undefined,
            customer_id: parentOrder.customer_id ?? undefined,
            sales_channel_id: parentOrder.sales_channel_id ?? undefined,
            email: parentOrder.email ?? undefined,
            currency_code: parentOrder.currency_code,
            items: vendorItems.map((item) => ({
              title: item.title || "Item",
              quantity: Number(item.quantity ?? 1),
              unit_price: Number(item.unit_price ?? 0),
              variant_id: item.variant_id ?? undefined,
              product_id: item.product_id ?? undefined,
              metadata: item.metadata ?? undefined,
            })),
            metadata: {
              parent_order_id: parentOrder.id,
              vendor_id: vendorId,
            },
          },
          context,
        })

        childOrderIds.push(childOrder.id)

        await link.create({
          [VENDOR_MODULE]: { vendor_id: vendorId },
          [Modules.ORDER]: { order_id: childOrder.id },
        })
      }
    } catch (err) {
      return StepResponse.permanentFailure(
        `Could not split order ${orderId} across vendors: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { childOrderIds, vendorIds, parentOrderId: parentOrder.id }
      )
    }

    logger.info(
      `Order ${orderId} split into ${childOrderIds.length} vendor orders (${vendorIds.join(", ")}).`
    )

    return new StepResponse<SplitResult, SplitCompensate>(
      { childOrderIds, vendorIds, linkedParent: false },
      { childOrderIds, vendorIds, parentOrderId: parentOrder.id }
    )
  },
  async (compensate, { container }) => {
    if (!compensate?.childOrderIds?.length) {
      return
    }
    for (const childOrderId of compensate.childOrderIds) {
      try {
        await cancelOrderWorkflow(container).run({
          input: { order_id: childOrderId },
        })
      } catch {
        // Best effort: the parent order is already placed, we do not want the
        // compensation itself to throw.
      }
    }
  }
)

export const splitOrderByVendorWorkflow = createWorkflow(
  "split-order-by-vendor",
  (input: SplitOrderInput) => {
    const result = splitOrderStep(input)
    return new WorkflowResponse(result)
  }
)

export default splitOrderByVendorWorkflow
