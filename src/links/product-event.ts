import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import EventModule from "../modules/event"

export default defineLink(
  ProductModule.linkable.product,
  EventModule.linkable.event
)
