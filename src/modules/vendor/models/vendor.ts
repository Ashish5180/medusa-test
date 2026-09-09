import { model } from "@medusajs/framework/utils"

export const Vendor = model.define("vendor", {
  id: model.id().primaryKey(),
  name: model.text(),
  handle: model.text(),
  logo: model.text().nullable(),
  email: model.text().nullable(),
  /** Percentage the platform keeps from every sale, e.g. 15 means 15%. */
  commission_rate: model.number().default(15),
  is_platform: model.boolean().default(false),
  is_active: model.boolean().default(true),
})

export default Vendor
