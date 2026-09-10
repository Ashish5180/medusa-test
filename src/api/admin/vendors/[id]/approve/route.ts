import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { fail } from "../../../../_helpers/http"
import { resolveTenant } from "../../../../../lib/tenant"
import { VENDOR_MODULE } from "../../../../../modules/vendor"
import VendorModuleService from "../../../../../modules/vendor/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const tenant = await resolveTenant(req)
  if (!tenant.is_platform) {
    res.status(403).json({ message: "Only the platform super-admin can approve vendor applications." })
    return
  }

  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)

  try {
    const vendor = await vendorService.retrieveVendor(req.params.id)
    if (!vendor) {
      res.status(404).json({ message: `Vendor ${req.params.id} not found.` })
      return
    }

    const updated = await vendorService.updateVendors({
      id: req.params.id,
      status: "active",
      is_active: true,
    })

    res.json({
      success: true,
      message: `Vendor "${updated.name}" has been approved and activated.`,
      vendor: updated,
    })
  } catch (err) {
    fail(res, err, "Failed to approve vendor")
  }
}
