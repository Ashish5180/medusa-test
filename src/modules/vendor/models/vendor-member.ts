import { model } from "@medusajs/framework/utils"

export const VendorMember = model.define("vendor_member", {
  id: model.id().primaryKey(),
  vendor_id: model.text(),
  user_id: model.text(),
  role: model.enum(["platform", "owner", "staff"]).default("owner"),
})

export default VendorMember
