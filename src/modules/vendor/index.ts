import { Module } from "@medusajs/framework/utils"
import VendorModuleService from "./service"

export const VENDOR_MODULE = "vendorModuleService"

export default Module(VENDOR_MODULE, {
  service: VendorModuleService,
})
