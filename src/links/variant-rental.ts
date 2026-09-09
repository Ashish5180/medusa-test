import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import RentalModule from "../modules/rental"

/** One rental fleet item is rented through one product variant. */
export default defineLink(RentalModule.linkable.rentalItem, {
  linkable: ProductModule.linkable.productVariant.id,
  isList: false,
})
