import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { VENDOR_MODULE } from "../../../modules/vendor"
import VendorModuleService from "../../../modules/vendor/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)

  const vendors = await vendorService.listVendors(
    { status: "active", is_active: true, is_platform: false },
    { order: { name: "ASC" } }
  )

  res.json({
    vendors: vendors.map((v) => ({
      id: v.id,
      name: v.name,
      handle: v.handle,
      logo: v.logo,
      description: v.description,
      status: v.status,
    })),
  })
}
