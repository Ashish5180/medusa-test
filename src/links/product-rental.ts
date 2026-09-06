import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import RentalModule from "../modules/rental"

export default defineLink(
  ProductModule.linkable.product,
  RentalModule.linkable.rentalItem
)
