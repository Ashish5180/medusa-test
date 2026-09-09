import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { deleteProductsWorkflow, updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { z } from "zod"
import { fail, parseBody } from "../../../../_helpers/http"
import { getVendorsForProducts, linkProductToVendor } from "../../../../../lib/marketplace"
import { verticalFromKind } from "../../../../../lib/commerce"
import { resolveTenant, type Tenant } from "../../../../../lib/tenant"

const updateProductSchema = z.object({
  title: z.string().min(1).optional(),
  price: z.coerce.number().nonnegative().optional(),
  status: z.enum(["published", "draft"]).optional(),
  type: z.enum(["physical", "booking", "rental", "event"]).optional(),
  /** Platform-only: hand the product to a different vendor. */
  vendor_id: z.string().optional(),
})

/**
 * A vendor may only touch products it owns. Returns the owning vendor id, or
 * null when the caller is allowed through as the platform.
 */
async function assertOwnership(
  req: MedusaRequest,
  res: MedusaResponse,
  tenant: Tenant
): Promise<{ ok: boolean; ownerId: string | null }> {
  const owners = await getVendorsForProducts(req.scope, [req.params.id])
  const ownerId = owners.get(req.params.id)?.id ?? null

  if (tenant.is_platform) {
    return { ok: true, ownerId }
  }

  if (!ownerId || ownerId !== tenant.vendor?.id) {
    res.status(403).json({ message: "This product belongs to another vendor." })
    return { ok: false, ownerId }
  }

  return { ok: true, ownerId }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const tenant = await resolveTenant(req)
  const { ok } = await assertOwnership(req, res, tenant)
  if (!ok) {
    return
  }

  const body = parseBody(updateProductSchema, req.body, res)
  if (!body) {
    return
  }

  try {
    const update: Record<string, unknown> = { id: req.params.id }
    if (body.title !== undefined) {
      update.title = body.title
    }
    if (body.status !== undefined) {
      update.status = body.status
    }
    if (body.type !== undefined) {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      const { data: products } = await query.graph({
        entity: "product",
        fields: ["id", "metadata"],
        filters: { id: req.params.id },
      })
      update.metadata = {
        ...((products[0] as { metadata?: Record<string, unknown> } | undefined)?.metadata || {}),
        type: body.type,
        vertical: verticalFromKind(body.type),
      }
    }

    const { result } = await updateProductsWorkflow(req.scope).run({
      input: { products: [update] as never },
    })

    if (body.vendor_id && tenant.is_platform) {
      await linkProductToVendor(req.scope, body.vendor_id, req.params.id)
    }

    res.json({ success: true, product: result[0] })
  } catch (err) {
    fail(res, err, "Failed to update product")
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const tenant = await resolveTenant(req)
  const { ok } = await assertOwnership(req, res, tenant)
  if (!ok) {
    return
  }

  try {
    await deleteProductsWorkflow(req.scope).run({ input: { ids: [req.params.id] } })
    res.json({ success: true, id: req.params.id, deleted: true })
  } catch (err) {
    fail(res, err, "Failed to delete product")
  }
}
