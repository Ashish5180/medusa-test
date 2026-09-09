import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import { createProductsWorkflow, updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { APPOINTMENT_MODULE } from "../modules/appointment"
import { EVENT_MODULE } from "../modules/event"
import { RENTAL_MODULE } from "../modules/rental"
import {
  centsToAmount,
  PRODUCT_KIND,
  type ProductKind,
  VERTICAL,
  verticalFromKind,
} from "./commerce"

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

export async function applyProductKind(
  container: MedusaContainer,
  productId: string,
  kind: ProductKind,
  extra: Record<string, unknown> = {}
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "metadata"],
    filters: { id: productId },
  })
  const product = data[0] as { id: string; metadata?: Record<string, unknown> | null } | undefined
  if (!product?.id) {
    return
  }
  await updateProductsWorkflow(container).run({
    input: {
      products: [
        {
          id: productId,
          metadata: {
            ...(product.metadata || {}),
            type: kind,
            vertical: verticalFromKind(kind),
            ...extra,
          },
        },
      ],
    },
  })
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
    late_fee_per_day?: number
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
          metadata: {
            type: PRODUCT_KIND.RENTAL,
            vertical: VERTICAL.RENTAL,
            rental_item_id: item.id,
          },
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
              metadata: {
                type: PRODUCT_KIND.RENTAL,
                security_deposit_price: item.deposit_amount,
                late_fee_rate: item.late_fee_per_day ?? 0,
              },
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
  const variantId = product.variants?.[0]?.id
  if (variantId) {
    try {
      await link.create({
        [RENTAL_MODULE]: { rental_item_id: item.id },
        [Modules.PRODUCT]: { product_variant_id: variantId },
      })
    } catch {
      // Product link is enough for cart; variant link is extra.
    }
  }

  return getProductForRentalItem(container, item.id)
}

export async function getProductForEvent(
  container: MedusaContainer,
  eventId: string
): Promise<LinkedProduct> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "event",
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
    filters: { id: eventId },
  })

  const product = (data[0] as { product?: LinkedProduct | LinkedProduct[] })?.product
  const resolved = Array.isArray(product) ? product[0] : product
  if (!resolved?.id || !resolved.variants?.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Event ${eventId} is not linked to a sellable product.`
    )
  }
  return resolved
}

export async function ensureEventCatalogProduct(
  container: MedusaContainer,
  event: {
    id: string
    title: string
    venue?: string | null
    event_start?: Date | string
  }
): Promise<LinkedProduct> {
  try {
    return await getProductForEvent(container, event.id)
  } catch {
    // Create a catalog product so the ticket can sit in a mixed cart.
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

  const handle = `event-${event.id.toLowerCase()}`
  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: event.title,
          handle,
          description: `Event ticket · ${event.venue || "Venue"}`,
          status: ProductStatus.PUBLISHED,
          discountable: true,
          metadata: {
            type: PRODUCT_KIND.EVENT,
            vertical: VERTICAL.EVENT,
            event_id: event.id,
          },
          shipping_profile_id: shippingProfiles[0]?.id,
          sales_channels: salesChannels[0]?.id ? [{ id: salesChannels[0].id }] : [],
          options: [{ title: "Tier", values: ["GA"] }],
          variants: [
            {
              title: "General Admission",
              sku: `EVT-${event.id.slice(-8)}`,
              options: { Tier: "GA" },
              manage_inventory: false,
              metadata: {
                type: PRODUCT_KIND.EVENT,
                event_id: event.id,
                seating_tier_id: "ga",
                ticket_type: "General Admission",
              },
              prices: [
                { amount: 25, currency_code: "eur" },
                { amount: 25, currency_code: "usd" },
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
    [EVENT_MODULE]: { event_id: event.id },
  })

  return getProductForEvent(container, event.id)
}

export async function ensureAppointmentCatalogProduct(
  container: MedusaContainer,
  slot: {
    id: string
    service_id?: string | null
    product_id?: string | null
    resource_name?: string | null
    slot_start?: Date | string
    slot_end?: Date | string
    max_capacity?: number | null
  }
): Promise<LinkedProduct> {
  try {
    const product = await getProductForAppointmentSlot(container, slot)
    await applyProductKind(container, product.id, PRODUCT_KIND.BOOKING)
    const link = container.resolve(ContainerRegistrationKeys.LINK)
    try {
      await link.create({
        [Modules.PRODUCT]: { product_id: product.id },
        [APPOINTMENT_MODULE]: { service_slot_id: slot.id },
      })
    } catch {
      // Already linked.
    }
    return product
  } catch {
    // Create a catalog product so the slot can sit in a mixed cart.
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

  const start = slot.slot_start ? new Date(slot.slot_start) : new Date()
  const end = slot.slot_end ? new Date(slot.slot_end) : new Date(start.getTime() + 60 * 60 * 1000)
  const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000))
  const title = `${slot.resource_name || "Booking"} · ${duration} min`
  const handle = `booking-slot-${slot.id.toLowerCase()}`

  const { result } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title,
          handle,
          description: `Bookable slot linked to ${slot.id}.`,
          status: ProductStatus.PUBLISHED,
          discountable: true,
          metadata: {
            type: PRODUCT_KIND.BOOKING,
            vertical: VERTICAL.APPOINTMENT,
            slot_id: slot.id,
          },
          shipping_profile_id: shippingProfiles[0]?.id,
          sales_channels: salesChannels[0]?.id ? [{ id: salesChannels[0].id }] : [],
          options: [{ title: "Duration", values: [`${duration}min`] }],
          variants: [
            {
              title: `${duration} min`,
              sku: `BOOK-${slot.id.slice(-8)}`,
              options: { Duration: `${duration}min` },
              manage_inventory: false,
              metadata: {
                type: PRODUCT_KIND.BOOKING,
                booking_slot_start: start.toISOString(),
                booking_slot_end: end.toISOString(),
                duration_minutes: duration,
                max_capacity: slot.max_capacity ?? 1,
              },
              prices: [
                { amount: 60, currency_code: "eur" },
                { amount: 60, currency_code: "usd" },
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
    [APPOINTMENT_MODULE]: { service_slot_id: slot.id },
  })

  return getProductForAppointmentSlot(container, {
    ...slot,
    product_id: product.id,
    service_id: product.id,
  })
}
