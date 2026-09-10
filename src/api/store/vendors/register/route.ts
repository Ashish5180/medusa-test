import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { Modules } from "@medusajs/framework/utils"
import { fail, parseBody } from "../../../_helpers/http"
import { VENDOR_MODULE } from "../../../../modules/vendor"
import VendorModuleService from "../../../../modules/vendor/service"
import { linkUserToVendor } from "../../../../lib/marketplace"

const registerVendorSchema = z.object({
  name: z.string().min(1, "Store name is required"),
  handle: z.string().min(1, "Handle is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  description: z.string().optional(),
  logo: z.string().optional(),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = parseBody(registerVendorSchema, req.body, res)
  if (!body) {
    return
  }

  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)
  const normalizedHandle = body.handle.toLowerCase().replace(/\s+/g, "-")

  let step = "check_existing"
  try {
    // Check if vendor with same handle already exists
    const existing = await vendorService.listVendors({ handle: normalizedHandle })
    if (existing.length) {
      res.status(409).json({ message: `A vendor with handle "${normalizedHandle}" already exists.` })
      return
    }

    step = "create_vendor"
    // 1. Create Vendor in pending_approval status
    const vendor = await vendorService.createVendors({
      name: body.name,
      handle: normalizedHandle,
      email: body.email,
      description: body.description ?? null,
      logo: body.logo ?? null,
      status: "pending_approval",
      commission_rate: 15,
      is_platform: false,
      is_active: false,
    })

    step = "create_user"
    // 2. Create User Account in User Module
    const userModule = req.scope.resolve(Modules.USER) as {
      createUsers: (
        users: Array<{ email: string; first_name?: string; last_name?: string }>
      ) => Promise<Array<{ id: string; email: string }>>
    }
    const createdUsers = await userModule.createUsers([
      {
        email: body.email,
        first_name: body.name,
        last_name: "Owner",
      },
    ])
    const user = createdUsers[0]

    step = "create_vendor_admin"
    // 3. Create VendorAdmin & VendorMember associations
    await vendorService.createVendorAdmins({
      vendor_id: vendor.id,
      user_id: user.id,
      email: body.email,
      first_name: body.name,
      last_name: "Owner",
      role: "owner",
    })

    step = "create_vendor_member"
    await vendorService.createVendorMembers({
      vendor_id: vendor.id,
      user_id: user.id,
      role: "owner",
    })

    step = "link_user"
    // 4. Link User to Vendor
    await linkUserToVendor(req.scope, vendor.id, user.id)

    res.status(201).json({
      success: true,
      message: "Vendor application submitted successfully and is pending approval.",
      vendor: {
        id: vendor.id,
        name: vendor.name,
        handle: vendor.handle,
        email: vendor.email,
        description: vendor.description,
        status: vendor.status,
      },
      userId: user.id,
    })
  } catch (err) {
    console.error(`Vendor registration error during ${step}:`, err)
    fail(res, err, `Failed to register vendor at ${step}`)
  }
}
