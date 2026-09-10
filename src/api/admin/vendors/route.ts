import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { fail, parseBody } from "../../_helpers/http"
import { resolveTenant } from "../../../lib/tenant"
import { VENDOR_MODULE } from "../../../modules/vendor"
import VendorModuleService from "../../../modules/vendor/service"

const createVendorSchema = z.object({
  name: z.string().min(1, "name is required"),
  handle: z.string().min(1, "handle is required"),
  email: z.string().email().optional(),
  description: z.string().optional(),
  logo: z.string().optional(),
  status: z.enum(["pending_approval", "active", "suspended"]).optional(),
  commission_rate: z.coerce.number().min(0).max(100).optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const tenant = await resolveTenant(req)
  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)

  if (!tenant.is_platform) {
    const members = tenant.vendor
      ? await vendorService.listVendorMembers({ vendor_id: tenant.vendor.id })
      : []
    res.json({
      vendors: tenant.vendor ? [tenant.vendor] : [],
      members,
    })
    return
  }

  const vendors = await vendorService.listVendors({}, { order: { created_at: "DESC" } })
  const members = await vendorService.listVendorMembers({}, { order: { created_at: "DESC" } })
  res.json({ vendors, members })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const tenant = await resolveTenant(req)
  if (!tenant.is_platform) {
    res.status(403).json({ message: "Only the platform admin can create vendors." })
    return
  }

  const body = parseBody(createVendorSchema, req.body, res)
  if (!body) {
    return
  }

  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)

  try {
    const vendor = await vendorService.createVendors({
      name: body.name,
      handle: body.handle.toLowerCase().replace(/\s+/g, "-"),
      email: body.email ?? null,
      description: body.description ?? null,
      logo: body.logo ?? null,
      status: body.status ?? "active",
      commission_rate: body.commission_rate ?? 15,
      is_platform: false,
      is_active: body.status !== "suspended",
    })
    res.json({ success: true, vendor })
  } catch (err) {
    fail(res, err, "Failed to create vendor")
  }
}
