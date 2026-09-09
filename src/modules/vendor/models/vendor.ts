import { model } from "@medusajs/framework/utils"

export const Vendor = model.define("vendor", {
  id: model.id().primaryKey(),
  name: model.text(),
  handle: model.text(),
  logo: model.text().nullable(),
  is_platform: model.boolean().default(false),
  is_active: model.boolean().default(true),
})

export default Vendor
