import { defineLink } from "@medusajs/framework/utils"
import StockLocationModule from "@medusajs/medusa/stock-location"
import VendorModule from "../modules/vendor"

export default defineLink(VendorModule.linkable.vendor, {
  linkable: StockLocationModule.linkable.stockLocation.id,
  isList: true,
})
