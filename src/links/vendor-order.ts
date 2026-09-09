import { defineLink } from "@medusajs/framework/utils"
import OrderModule from "@medusajs/medusa/order"
import VendorModule from "../modules/vendor"

export default defineLink(VendorModule.linkable.vendor, {
  linkable: OrderModule.linkable.order.id,
  isList: true,
})
