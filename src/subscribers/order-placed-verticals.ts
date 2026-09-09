import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import bindVerticalsToOrderWorkflow from "../workflows/cart/bind-verticals-to-order"

export default async function orderPlacedVerticals({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve("query") as {
    graph: (args: Record<string, unknown>) => Promise<{ data: any[] }>
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "cart.id",
      "customer_id",
      "items.id",
      "items.quantity",
      "items.metadata",
    ],
    filters: { id: data.id },
  })

  const order = orders[0]
  if (!order) {
    return
  }

  await bindVerticalsToOrderWorkflow(container).run({
    input: {
      orderId: order.id,
      cartId: order.cart?.id,
      customerId: order.customer_id,
      items: order.items || [],
    },
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
