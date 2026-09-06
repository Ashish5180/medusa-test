import RentalModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const RENTAL_MODULE = "rentalModuleService"

export default Module(RENTAL_MODULE, {
  service: RentalModuleService,
})
