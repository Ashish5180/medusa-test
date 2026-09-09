import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getVendorOrderMap, splitCommission } from "../../../../lib/marketplace"
import { resolveTenant } from "../../../../lib/tenant"

type OrderRow = {
  id: string
  status?: string
  total?: number
  currency_code?: string
}

/**
 * Per-vendor earnings: gross sales, the platform's commission, and what the
 * vendor is owed. Cancelled orders are excluded.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const tenant = await resolveTenant(req)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const vendorMap = await getVendorOrderMap(req.scope)
  const scoped = tenant.is_platform
    ? vendorMap
    : vendorMap.filter((entry) => entry.vendor.id === tenant.vendor?.id)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "status", "total", "currency_code"],
    pagination: { take: 500 },
  })

  const orderById = new Map((orders as OrderRow[]).map((order) => [order.id, order]))

  const payouts = scoped.map((entry) => {
    let gross = 0
    let orderCount = 0
    let currency = "eur"

    for (const orderId of entry.orderIds) {
      const order = orderById.get(orderId)
      if (!order || order.status === "canceled") {
        continue
      }
      gross += Number(order.total ?? 0)
      orderCount += 1
      currency = order.currency_code || currency
    }

    const { commission, payout, rate } = splitCommission(
      gross,
      Number(entry.vendor.commission_rate ?? 0)
    )

    return {
      vendor_id: entry.vendor.id,
      vendor_name: entry.vendor.name,
      vendor_handle: entry.vendor.handle,
      commission_rate: rate,
      order_count: orderCount,
      gross_sales: gross,
      platform_commission: commission,
      vendor_payout: payout,
      currency_code: currency,
    }
  })

  res.json({
    payouts,
    totals: {
      gross_sales: payouts.reduce((sum, row) => sum + row.gross_sales, 0),
      platform_commission: payouts.reduce((sum, row) => sum + row.platform_commission, 0),
      vendor_payout: payouts.reduce((sum, row) => sum + row.vendor_payout, 0),
      currency_code: payouts[0]?.currency_code || "eur",
    },
  })
}
