import { defineLink } from "@medusajs/framework/utils"
import SalesChannelModule from "@medusajs/medusa/sales-channel"
import VendorModule from "../modules/vendor"

export default defineLink(VendorModule.linkable.vendor, {
  linkable: SalesChannelModule.linkable.salesChannel.id,
  isList: true,
})
