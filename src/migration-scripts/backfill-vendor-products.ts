import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { VENDOR_MODULE } from "../modules/vendor"
import VendorModuleService from "../modules/vendor/service"

/**
 * Gives every existing product an owning vendor so the marketplace views are
 * not empty. Products already linked to a vendor are left alone, so this is
 * safe to run more than once.
 */
export default async function backfillVendorProducts({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const vendorService: VendorModuleService = container.resolve(VENDOR_MODULE)

  const vendors = (await vendorService.listVendors({ is_platform: false })).filter(
    (vendor) => vendor.is_active !== false
  )

  if (!vendors.length) {
    logger.warn("No non-platform vendors found. Run seed-vendors first.")
    return
  }

  const { data: owned } = await query.graph({
    entity: "vendor",
    fields: ["id", "products.id"],
  })

  const alreadyOwned = new Set<string>()
  for (const row of owned) {
    for (const product of (row.products ?? []) as { id?: string }[]) {
      if (product?.id) {
        alreadyOwned.add(product.id)
      }
    }
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title"],
    pagination: { take: 500, order: { created_at: "ASC" } },
  })

  let assigned = 0
  let index = 0

  for (const product of products as { id: string; title?: string }[]) {
    if (alreadyOwned.has(product.id)) {
      continue
    }

    const vendor = vendors[index % vendors.length]
    index += 1

    await link.create({
      [VENDOR_MODULE]: { vendor_id: vendor.id },
      [Modules.PRODUCT]: { product_id: product.id },
    })

    assigned += 1
    logger.info(`Assigned "${product.title ?? product.id}" to ${vendor.name}.`)
  }

  logger.info(
    `Backfill done. ${assigned} product(s) assigned, ${alreadyOwned.size} already had an owner.`
  )
}
