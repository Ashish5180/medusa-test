import type { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { VENDOR_MODULE } from "../modules/vendor"
import type { Tenant } from "./tenant"

export type VendorRef = {
  id: string
  name: string
  handle: string
  commission_rate?: number
}

type QueryGraph = {
  graph: (config: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
    pagination?: Record<string, unknown>
  }) => Promise<{ data: Record<string, unknown>[] }>
}

/**
 * Maps product ids to the vendor that owns them, using the vendor-product link.
 * Products created before the marketplace layer existed have no owner and come
 * back as unmapped.
 */
export async function getVendorsForProducts(
  container: MedusaContainer,
  productIds: string[]
): Promise<Map<string, VendorRef>> {
  const owners = new Map<string, VendorRef>()
  if (!productIds.length) {
    return owners
  }

  const query: QueryGraph = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "vendor",
    fields: ["id", "name", "handle", "commission_rate", "products.id"],
  })

  const wanted = new Set(productIds)
  for (const row of data) {
    const vendor: VendorRef = {
      id: String(row.id),
      name: String(row.name ?? ""),
      handle: String(row.handle ?? ""),
      commission_rate: Number(row.commission_rate ?? 0),
    }
    const products = (row.products ?? []) as { id?: string }[]
    for (const product of products) {
      if (product?.id && wanted.has(product.id)) {
        owners.set(product.id, vendor)
      }
    }
  }

  return owners
}

/** Product ids owned by a vendor. */
export async function getProductIdsForVendor(
  container: MedusaContainer,
  vendorId: string
): Promise<string[]> {
  const query: QueryGraph = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "vendor",
    fields: ["id", "products.id"],
    filters: { id: vendorId },
  })

  const products = (data[0]?.products ?? []) as { id?: string }[]
  return products.map((product) => product?.id).filter((id): id is string => Boolean(id))
}

/** Order ids attributed to a vendor through the vendor-order link. */
export async function getOrderIdsForVendor(
  container: MedusaContainer,
  vendorId: string
): Promise<string[]> {
  const query: QueryGraph = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "vendor",
    fields: ["id", "orders.id"],
    filters: { id: vendorId },
  })

  const orders = (data[0]?.orders ?? []) as { id?: string }[]
  return orders.map((order) => order?.id).filter((id): id is string => Boolean(id))
}

/** Every vendor with the order ids attributed to it. */
export async function getVendorOrderMap(
  container: MedusaContainer
): Promise<{ vendor: VendorRef; orderIds: string[] }[]> {
  const query: QueryGraph = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "vendor",
    fields: ["id", "name", "handle", "commission_rate", "is_platform", "orders.id"],
  })

  return data
    .filter((row) => !row.is_platform)
    .map((row) => ({
      vendor: {
        id: String(row.id),
        name: String(row.name ?? ""),
        handle: String(row.handle ?? ""),
        commission_rate: Number(row.commission_rate ?? 0),
      },
      orderIds: ((row.orders ?? []) as { id?: string }[])
        .map((order) => order?.id)
        .filter((id): id is string => Boolean(id)),
    }))
}

/** Attach a product to a vendor. */
export async function linkProductToVendor(
  container: MedusaContainer,
  vendorId: string,
  productId: string
) {
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  await link.create({
    [VENDOR_MODULE]: { vendor_id: vendorId },
    [Modules.PRODUCT]: { product_id: productId },
  })
}

/** Attach an order to a vendor. */
export async function linkOrderToVendor(
  container: MedusaContainer,
  vendorId: string,
  orderId: string
) {
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  await link.create({
    [VENDOR_MODULE]: { vendor_id: vendorId },
    [Modules.ORDER]: { order_id: orderId },
  })
}

/** Attach a user to a vendor. */
export async function linkUserToVendor(
  container: MedusaContainer,
  vendorId: string,
  userId: string
) {
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  await link.create({
    [VENDOR_MODULE]: { vendor_id: vendorId },
    [Modules.USER]: { user_id: userId },
  })
}

/** Attach a stock location to a vendor. */
export async function linkStockLocationToVendor(
  container: MedusaContainer,
  vendorId: string,
  stockLocationId: string
) {
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  await link.create({
    [VENDOR_MODULE]: { vendor_id: vendorId },
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId },
  })
}

/** Attach a sales channel to a vendor. */
export async function linkSalesChannelToVendor(
  container: MedusaContainer,
  vendorId: string,
  salesChannelId: string
) {
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  await link.create({
    [VENDOR_MODULE]: { vendor_id: vendorId },
    [Modules.SALES_CHANNEL]: { sales_channel_id: salesChannelId },
  })
}

/**
 * Which vendor a write should be attributed to. Platform users may act on
 * behalf of any vendor by passing an explicit id.
 */
export function resolveActingVendorId(
  tenant: Tenant,
  explicitVendorId?: string
): string | null {
  if (!tenant.is_platform) {
    return tenant.vendor?.id ?? null
  }
  return explicitVendorId || null
}

/** Platform's cut and the vendor's take-home, in the order's currency minor units. */
export function splitCommission(total: number, commissionRate: number) {
  const rate = Number.isFinite(commissionRate) ? commissionRate : 0
  const commission = Math.round((total * rate) / 100)
  return {
    commission,
    payout: total - commission,
    rate,
  }
}

