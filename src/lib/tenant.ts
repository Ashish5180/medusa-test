import type {
  AuthenticatedMedusaRequest,
  MedusaRequest,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { VENDOR_MODULE } from "../modules/vendor"
import VendorModuleService from "../modules/vendor/service"

function actorIdFromRequest(req: MedusaRequest): string | undefined {
  return (req as AuthenticatedMedusaRequest).auth_context?.actor_id
}

export type Tenant = {
  userId: string
  role: "platform" | "owner" | "admin" | "staff"
  is_platform: boolean
  vendor: { id: string; name: string; handle: string; is_platform: boolean } | null
}

export async function resolveTenant(req: MedusaRequest): Promise<Tenant> {
  const userId = actorIdFromRequest(req)
  if (!userId) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "Not authenticated.")
  }

  const vendorService: VendorModuleService = req.scope.resolve(VENDOR_MODULE)
  let membership: Awaited<ReturnType<VendorModuleService["getMembershipForUser"]>> = null
  try {
    membership = await vendorService.getMembershipForUser(userId)
  } catch (err) {
    const message = err instanceof Error ? err.message : ""
    if (message.includes("does not exist")) {
      return {
        userId,
        role: "platform",
        is_platform: true,
        vendor: null,
      }
    }
    throw err
  }

  if (!membership) {
    return {
      userId,
      role: "platform",
      is_platform: true,
      vendor: null,
    }
  }

  const isPlatform =
    membership.vendor.is_platform || membership.member.role === "platform"

  return {
    userId,
    role: membership.member.role,
    is_platform: isPlatform,
    vendor: {
      id: membership.vendor.id,
      name: membership.vendor.name,
      handle: membership.vendor.handle,
      is_platform: membership.vendor.is_platform,
    },
  }
}

export function vendorScope(tenant: Tenant): { vendor_id?: string } {
  if (tenant.is_platform) {
    return {}
  }
  if (!tenant.vendor?.id) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "This user is not assigned to a vendor."
    )
  }
  return { vendor_id: tenant.vendor.id }
}
