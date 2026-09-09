import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { RENTAL_MODULE } from "../modules/rental"
import { centsToAmount } from "./commerce"

type LinkedProduct = {
  id: string
  title?: string
  handle?: string
  metadata?: Record<string, unknown> | null
  variants?: Array<{
    id: string
    title?: string
    sku?: string
    manage_inventory?: boolean
  }>
}

export async function getProductForRentalItem(
  container: MedusaContainer,
  rentalItemId: string
): Promise<LinkedProduct> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "rental_item",
    fields: [
      "id",
      "product.id",
      "product.title",
      "product.handle",
      "product.metadata",
      "product.variants.id",
      "product.variants.title",
      "product.variants.sku",
      "product.variants.manage_inventory",
    ],
    filters: { id: rentalItemId },
  })

  const product = (data[0] as { product?: LinkedProduct | LinkedProduct[] })?.product
  const resolved = Array.isArray(product) ? product[0] : product
  if (!resolved?.id || !resolved.variants?.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Rental item ${rentalItemId} is not linked to a sellable product. Link it to a Product before adding it to a cart.`
    )
  }
  return resolved
}

export async function getProductForAppointmentSlot(
  container: MedusaContainer,
  slot: { id: string; service_id?: string | null; product_id?: string | null }
): Promise<LinkedProduct> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "service_slot",
    fields: [
      "id",
      "product.id",
      "product.title",
      "product.handle",
      "product.metadata",
      "product.variants.id",
      "product.variants.title",
      "product.variants.sku",
      "product.variants.manage_inventory",
    ],
    filters: { id: slot.id },
  })

  const linked = (data[0] as { product?: LinkedProduct | LinkedProduct[] })?.product
  const fromLink = Array.isArray(linked) ? linked[0] : linked
  const productId = fromLink?.id || slot.product_id || slot.service_id

  if (fromLink?.id && fromLink.variants?.length) {
    return fromLink
  }

  if (!productId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Appointment slot ${slot.id} is not linked to a product.`
    )
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "metadata", "variants.id", "variants.title", "variants.sku"],
    filters: { id: productId },
  })

  const product = products[0] as LinkedProduct | undefined
  if (!product?.id || !product.variants?.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Appointment slot ${slot.id} points at product ${productId}, which is missing or has no variants.`
    )
  }
  return product
}

export function firstVariantId(product: LinkedProduct): string {
  const variantId = product.variants?.[0]?.id
  if (!variantId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Product ${product.id} has no variants.`
    )
  }
  return variantId
}

export async function ensureRentalCatalogProduct(
  container: MedusaContainer,
  item: {
    id: string
    daily_rate: number
    deposit_amount: number
    condition_grade?: string | null
  }
): Promise<LinkedProduct> {
  try {
    return await getProductForRentalItem(container, item.id)
  } catch {
    // Create a catalog product so the item can be added to a cart.
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id"],
  })

  const daily = centsToAmount(item.daily_rate)
  const title = `Rental · ${item.condition_grade || "Equipment"}`
  const handle = `rental-item-${item.id.toLowerCase()}`

  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title,
          handle,
          description: `Daily rental plus refundable deposit. Linked to fleet item ${item.id}.`,
          status: ProductStatus.PUBLISHED,
          discountable: false,
          metadata: { vertical: "rental", rental_item_id: item.id },
          shipping_profile_id: shippingProfiles[0]?.id,
          sales_channels: salesChannels[0]?.id
            ? [{ id: salesChannels[0].id }]
            : [],
          options: [{ title: "Term", values: ["Daily"] }],
          variants: [
            {
              title: "Daily",
              sku: `RENT-${item.id.slice(-8)}`,
              options: { Term: "Daily" },
              manage_inventory: false,
              prices: [
                { amount: daily, currency_code: "eur" },
                { amount: daily, currency_code: "usd" },
              ],
            },
          ],
        },
      ],
    },
  })

  const product = result[0] as LinkedProduct
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  await link.create({
    [Modules.PRODUCT]: { product_id: product.id },
    [RENTAL_MODULE]: { rental_item_id: item.id },
  })

  return getProductForRentalItem(container, item.id)
}
