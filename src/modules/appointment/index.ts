import AppointmentModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const APPOINTMENT_MODULE = "appointmentModuleService"

export default Module(APPOINTMENT_MODULE, {
  service: AppointmentModuleService,
})
