import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import AppointmentModule from "../modules/appointment"

export default defineLink(
  ProductModule.linkable.product,
  AppointmentModule.linkable.serviceSlot
)
