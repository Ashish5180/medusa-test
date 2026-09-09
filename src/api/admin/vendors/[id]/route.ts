import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { fail, parseBody } from "../../../_helpers/http"
import { resolveTenant } from "../../../../lib/tenant"
import { VENDOR_MODULE } from "../../../../modules/vendor"
import VendorModuleService from "../../../../modules/vendor/service"

const updateVendorSchema = z.object({
  name: z.string().min(1).optional(),
  handle: z.string().min(1).optional(),
  email: z.string().email().optional(),
  commission_rate: z.coerce.number().min(0).max(100).optional(),
  is_active: z.boolean().optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const tenant = await resolveTenant(req)
  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)

  if (!tenant.is_platform && tenant.vendor?.id !== req.params.id) {
    res.status(403).json({ message: "You can only view your own vendor." })
    return
  }

  try {
    const vendor = await vendorService.retrieveVendor(req.params.id)
    res.json({ vendor })
  } catch {
    res.status(404).json({ message: `Vendor ${req.params.id} not found.` })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const tenant = await resolveTenant(req)
  if (!tenant.is_platform) {
    res.status(403).json({ message: "Only the platform admin can update vendors." })
    return
  }

  const body = parseBody(updateVendorSchema, req.body, res)
  if (!body) {
    return
  }

  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)

  try {
    const vendor = await vendorService.updateVendors({
      id: req.params.id,
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.handle !== undefined
        ? { handle: body.handle.toLowerCase().replace(/\s+/g, "-") }
        : {}),
      ...(body.email !== undefined ? { email: body.email } : {}),
      ...(body.commission_rate !== undefined
        ? { commission_rate: body.commission_rate }
        : {}),
      ...(body.is_active !== undefined ? { is_active: body.is_active } : {}),
    })

    res.json({ success: true, vendor })
  } catch (err) {
    fail(res, err, "Failed to update vendor")
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const tenant = await resolveTenant(req)
  if (!tenant.is_platform) {
    res.status(403).json({ message: "Only the platform admin can delete vendors." })
    return
  }

  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)

  try {
    const vendor = await vendorService.retrieveVendor(req.params.id)
    if (vendor.is_platform) {
      res.status(400).json({ message: "The platform tenant cannot be deleted." })
      return
    }

    const members = await vendorService.listVendorMembers({ vendor_id: req.params.id })
    if (members.length) {
      res.status(400).json({
        message: `Cannot delete a vendor that still has ${members.length} member(s). Remove the members first.`,
      })
      return
    }

    await vendorService.deleteVendors(req.params.id)
    res.json({ success: true, id: req.params.id, deleted: true })
  } catch (err) {
    fail(res, err, "Failed to delete vendor")
  }
}
