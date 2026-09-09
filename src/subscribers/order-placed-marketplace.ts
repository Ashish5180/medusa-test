import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import splitOrderByVendorWorkflow from "../workflows/marketplace/split-order-by-vendor"

export default async function orderPlacedMarketplace({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    await splitOrderByVendorWorkflow(container).run({
      input: { orderId: data.id },
    })
  } catch (err) {
    // Splitting must never block a placed order. Log loudly and move on so the
    // customer still gets their confirmation.
    logger.error(
      `Marketplace split failed for order ${data.id}: ${
        err instanceof Error ? err.message : String(err)
      }`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
