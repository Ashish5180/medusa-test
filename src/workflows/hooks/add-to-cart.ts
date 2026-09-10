import { MedusaError, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { addToCartWorkflow } from "@medusajs/medusa/core-flows"
import { verticalFromKind, VERTICAL } from "../../lib/commerce"

addToCartWorkflow.hooks.validate(async ({ input }, { container }) => {
  const variantIds = (input.items || [])
    .map((item) => item.variant_id)
    .filter((id): id is string => Boolean(id))

  if (!variantIds.length) {
    return
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (args: Record<string, unknown>) => Promise<{ data: any[] }>
  }
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product.id", "product.metadata"],
    filters: { id: variantIds },
  })

  const verticalByVariant = new Map<string, string>()
  for (const variant of variants as Array<{ id: string; product?: { metadata?: Record<string, unknown> } }>) {
    const type = variant.product?.metadata?.type
    const vertical =
      (typeof variant.product?.metadata?.vertical === "string" &&
        variant.product.metadata.vertical) ||
      (typeof type === "string" ? verticalFromKind(type) : undefined)
    if (typeof vertical === "string") {
      verticalByVariant.set(variant.id, vertical)
    }
  }

  for (const item of input.items || []) {
    if (!item.variant_id) continue
    const productVertical = verticalByVariant.get(item.variant_id)
    const lineVertical = item.metadata?.vertical

    if (
      (productVertical === VERTICAL.APPOINTMENT ||
        productVertical === VERTICAL.RENTAL ||
        productVertical === VERTICAL.EVENT) &&
      lineVertical !== productVertical
    ) {
      const path =
        productVertical === VERTICAL.APPOINTMENT
          ? "appointment"
          : productVertical === VERTICAL.EVENT
            ? "event"
            : "rental"
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Product is a ${productVertical} listing. Add it with POST /store/carts/:id/line-items/${path}.`
      )
    }
  }
})
