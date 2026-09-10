import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { z } from "@medusajs/framework/zod"
import { fail, parseBody } from "../../../_helpers/http"
import {
  getVendorsForProducts,
  linkProductToVendor,
  resolveActingVendorId,
} from "../../../../lib/marketplace"
import { resolveTenant } from "../../../../lib/tenant"
import { kindFromVertical, PRODUCT_KIND, verticalFromKind } from "../../../../lib/commerce"

const createProductSchema = z.object({
  title: z.string().min(1, "title is required"),
  price: z.coerce.number().nonnegative(),
  currency_code: z.string().optional(),
  status: z.enum(["published", "draft"]).optional(),
  sales_channel_id: z.string().optional(),
  /** Platform users may create a product on behalf of a vendor. */
  vendor_id: z.string().optional(),
  type: z.enum(["physical", "booking", "rental", "event"]).optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const tenant = await resolveTenant(req)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "status",
      "thumbnail",
      "created_at",
      "metadata",
      "variants.id",
      "variants.metadata",
      "variants.prices.id",
      "variants.prices.amount",
      "variants.prices.currency_code",
    ],
    pagination: { take: 200, order: { created_at: "DESC" } },
  })

  const owners = await getVendorsForProducts(
    req.scope,
    products.map((product: { id: string }) => product.id)
  )

  const withOwner = products.map(
    (product: { id: string; metadata?: Record<string, unknown> | null }) => ({
      ...product,
      type:
        (product.metadata?.type as string) ||
        kindFromVertical(
          typeof product.metadata?.vertical === "string" ? product.metadata.vertical : null
        ),
      vendor: owners.get(product.id) ?? null,
    })
  )

  // Vendors only ever see their own catalog. Unowned legacy products stay
  // visible to the platform so they can be assigned an owner.
  const visible = tenant.is_platform
    ? withOwner
    : withOwner.filter((product) => product.vendor?.id === tenant.vendor?.id)

  res.json({
    products: visible,
    count: visible.length,
    unassigned: tenant.is_platform
      ? withOwner.filter((product) => !product.vendor).length
      : 0,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const tenant = await resolveTenant(req)
  const body = parseBody(createProductSchema, req.body, res)
  if (!body) {
    return
  }

  const vendorId = resolveActingVendorId(tenant, body.vendor_id)
  if (!vendorId) {
    res.status(400).json({
      message:
        "Pick a vendor to own this product. Platform users must pass vendor_id; vendor users are assigned automatically.",
    })
    return
  }

  try {
    const { result } = await createProductsWorkflow(req.scope).run({
      input: {
        products: [
          {
            title: body.title,
            status: body.status || "published",
            metadata: {
              type: body.type || PRODUCT_KIND.PHYSICAL,
              vertical: verticalFromKind(body.type || PRODUCT_KIND.PHYSICAL),
            },
            options: [{ title: "Default", values: ["Default"] }],
            variants: [
              {
                title: "Default",
                options: { Default: "Default" },
                metadata: { type: body.type || PRODUCT_KIND.PHYSICAL },
                manage_inventory: false,
                prices: [
                  {
                    amount: body.price,
                    currency_code: body.currency_code || "eur",
                  },
                ],
              },
            ],
            sales_channels: body.sales_channel_id ? [{ id: body.sales_channel_id }] : undefined,
          },
        ],
      },
    })

    const product = result[0]
    await linkProductToVendor(req.scope, vendorId, product.id)

    res.json({ success: true, product, vendor_id: vendorId })
  } catch (err) {
    fail(res, err, "Failed to create product")
  }
}
