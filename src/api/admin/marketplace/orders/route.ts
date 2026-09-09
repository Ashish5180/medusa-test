import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getVendorOrderMap, splitCommission } from "../../../../lib/marketplace"
import { resolveTenant } from "../../../../lib/tenant"

type OrderRow = {
  id: string
  display_id?: number
  email?: string
  status?: string
  total?: number
  currency_code?: string
  created_at?: string
  metadata?: Record<string, unknown> | null
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const tenant = await resolveTenant(req)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const vendorMap = await getVendorOrderMap(req.scope)

  // orderId -> vendor that owns it
  const ownerByOrder = new Map<string, (typeof vendorMap)[number]["vendor"]>()
  for (const entry of vendorMap) {
    for (const orderId of entry.orderIds) {
      ownerByOrder.set(orderId, entry.vendor)
    }
  }

  const visibleOrderIds = tenant.is_platform
    ? null
    : new Set(vendorMap.find((entry) => entry.vendor.id === tenant.vendor?.id)?.orderIds ?? [])

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "status",
      "total",
      "currency_code",
      "created_at",
      "metadata",
    ],
    pagination: { take: 200, order: { created_at: "DESC" } },
  })

  const rows = (orders as unknown as OrderRow[])
    .filter((order) => (visibleOrderIds ? visibleOrderIds.has(order.id) : true))
    .map((order) => {
      const vendor = ownerByOrder.get(order.id) ?? null
      const total = Number(order.total ?? 0)
      const { commission, payout, rate } = splitCommission(
        total,
        Number(vendor?.commission_rate ?? 0)
      )
      const parentOrderId = (order.metadata?.parent_order_id as string) || null

      return {
        ...order,
        vendor,
        is_child: Boolean(parentOrderId),
        parent_order_id: parentOrderId,
        commission_rate: vendor ? rate : null,
        commission_amount: vendor ? commission : null,
        vendor_payout: vendor ? payout : null,
      }
    })

  res.json({
    orders: rows,
    count: rows.length,
    unattributed: tenant.is_platform ? rows.filter((row) => !row.vendor).length : 0,
  })
}
