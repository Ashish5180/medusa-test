import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { VENDOR_MODULE } from "../../../../../modules/vendor"
import VendorModuleService from "../../../../../modules/vendor/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const handle = req.params.handle?.toLowerCase()
  if (!handle) {
    res.status(400).json({ message: "Vendor handle is required." })
    return
  }

  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)
  const vendors = await vendorService.listVendors({ handle })

  if (!vendors.length) {
    res.status(404).json({ message: `Vendor "${handle}" not found.` })
    return
  }

  const vendor = vendors[0]
  res.json({
    vendor: {
      id: vendor.id,
      name: vendor.name,
      handle: vendor.handle,
      logo: vendor.logo,
      description: vendor.description,
      status: vendor.status,
      is_active: vendor.is_active,
    },
  })
}
