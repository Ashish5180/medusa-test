import { model } from "@medusajs/framework/utils"

export const VendorAdmin = model.define("vendor_admin", {
  id: model.id().primaryKey(),
  vendor_id: model.text(),
  user_id: model.text().nullable(),
  email: model.text().nullable(),
  first_name: model.text().nullable(),
  last_name: model.text().nullable(),
  role: model.enum(["platform", "owner", "admin", "staff"]).default("owner"),
})

export default VendorAdmin
