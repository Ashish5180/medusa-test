import EventModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const EVENT_MODULE = "eventModuleService"

export default Module(EVENT_MODULE, {
  service: EventModuleService,
})
