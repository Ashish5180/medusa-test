import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules, MedusaError } from "@medusajs/framework/utils"
import { createUserAccountWorkflow } from "@medusajs/medusa/core-flows"
import { VENDOR_MODULE } from "../modules/vendor"
import VendorModuleService from "../modules/vendor/service"

const VENDOR_PASSWORD = "VendorPass123"

async function ensureUser(
  container: MedusaContainer,
  email: string,
  password: string,
  name: { first_name: string; last_name: string }
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: existing } = await query.graph({
    entity: "user",
    fields: ["id", "email"],
    filters: { email },
  })
  if (existing[0]?.id) {
    return existing[0].id as string
  }

  const auth = container.resolve(Modules.AUTH) as {
    register: (
      provider: string,
      data: { body: Record<string, string> }
    ) => Promise<{ success?: boolean; authIdentity?: { id: string }; error?: string }>
  }

  const registered = await auth.register("emailpass", {
    body: { email, password },
  })

  if (!registered.authIdentity?.id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      registered.error || `Could not register ${email}`
    )
  }

  const { result } = await createUserAccountWorkflow(container).run({
    input: {
      authIdentityId: registered.authIdentity.id,
      userData: { email, ...name },
    },
  })

  return result.id
}

export default async function seedVendors({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const vendorService: VendorModuleService = container.resolve(VENDOR_MODULE)

  const vendors = await vendorService.listVendors({})
  let platform = vendors.find((vendor) => vendor.is_platform)
  let studioA = vendors.find((vendor) => vendor.handle === "studio-a")
  let studioB = vendors.find((vendor) => vendor.handle === "studio-b")

  if (!platform) {
    platform = await vendorService.createVendors({
      name: "Baba Platform",
      handle: "platform",
      is_platform: true,
      is_active: true,
    })
  }
  if (!studioA) {
    studioA = await vendorService.createVendors({
      name: "Studio A",
      handle: "studio-a",
      is_platform: false,
      is_active: true,
    })
  }
  if (!studioB) {
    studioB = await vendorService.createVendors({
      name: "Studio B",
      handle: "studio-b",
      is_platform: false,
      is_active: true,
    })
  }

  const { data: admins } = await query.graph({
    entity: "user",
    fields: ["id", "email"],
  })
  const admin = (admins as { id: string; email?: string }[]).find(
    (user) => user.email === "admin@baba.ai"
  )
  if (admin) {
    const existing = await vendorService.listVendorMembers({ user_id: admin.id })
    if (!existing.length) {
      await vendorService.createVendorMembers({
        vendor_id: platform.id,
        user_id: admin.id,
        role: "platform",
      })
    }
  }

  const userA = await ensureUser(container, "studio.a@baba.ai", VENDOR_PASSWORD, {
    first_name: "Studio",
    last_name: "A",
  })
  const userB = await ensureUser(container, "studio.b@baba.ai", VENDOR_PASSWORD, {
    first_name: "Studio",
    last_name: "B",
  })

  if (!(await vendorService.listVendorMembers({ user_id: userA })).length) {
    await vendorService.createVendorMembers({
      vendor_id: studioA.id,
      user_id: userA,
      role: "owner",
    })
  }
  if (!(await vendorService.listVendorMembers({ user_id: userB })).length) {
    await vendorService.createVendorMembers({
      vendor_id: studioB.id,
      user_id: userB,
      role: "owner",
    })
  }

  logger.info("Vendor tenants ready:")
  logger.info("  Platform  admin@baba.ai / YourSecurePassword123")
  logger.info(`  Studio A  studio.a@baba.ai / ${VENDOR_PASSWORD}`)
  logger.info(`  Studio B  studio.b@baba.ai / ${VENDOR_PASSWORD}`)
}
