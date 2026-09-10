import { defineLink } from "@medusajs/framework/utils"
import UserModule from "@medusajs/medusa/user"
import VendorModule from "../modules/vendor"

export default defineLink(VendorModule.linkable.vendor, {
  linkable: UserModule.linkable.user.id,
  isList: true,
})
