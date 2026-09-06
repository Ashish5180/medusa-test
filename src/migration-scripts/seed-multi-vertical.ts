import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { RENTAL_MODULE } from "../modules/rental"
import { APPOINTMENT_MODULE } from "../modules/appointment"
import { EVENT_MODULE } from "../modules/event"
import RentalModuleService from "../modules/rental/service"
import AppointmentModuleService from "../modules/appointment/service"
import EventModuleService from "../modules/event/service"

export default async function seedMultiVerticalData({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  logger.info("Starting Multi-Vertical seed (Rentals, Appointments, Events)...")

  try {
    const rentalService: RentalModuleService = container.resolve(RENTAL_MODULE)
    const appointmentService: AppointmentModuleService =
      container.resolve(APPOINTMENT_MODULE)
    const eventService: EventModuleService = container.resolve(EVENT_MODULE)

    // 1. Seed Rental Items
    const existingRentals = await rentalService.listRentalItems({})
    if (existingRentals.length === 0) {
      const cameraRental = await rentalService.createRentalItems({
        deposit_amount: 300,
        daily_rate: 75,
        min_rental_days: 2,
        condition_grade: "Mint / Professional",
        is_active: true,
      })

      const projectorRental = await rentalService.createRentalItems({
        deposit_amount: 150,
        daily_rate: 45,
        min_rental_days: 1,
        condition_grade: "Excellent",
        is_active: true,
      })

      logger.info(
        `Seeded 2 rental items: ${cameraRental.id} (Sony Cinema FX3), ${projectorRental.id} (Laser 4K Projector)`
      )
    }

    // 2. Seed Appointment Slots
    const existingSlots = await appointmentService.listServiceSlots({})
    if (existingSlots.length === 0) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)

      const tomorrowEnd = new Date(tomorrow)
      tomorrowEnd.setHours(11, 0, 0, 0)

      const slot1 = await appointmentService.createServiceSlots({
        service_id: "consultation_60min",
        resource_id: "dr-vikram",
        resource_name: "Dr. Vikram (Senior Architect)",
        slot_start: tomorrow,
        slot_end: tomorrowEnd,
        max_capacity: 1,
        booked_count: 0,
        is_blocked: false,
      })

      const tomorrowAfternoon = new Date(tomorrow)
      tomorrowAfternoon.setHours(14, 0, 0, 0)
      const tomorrowAfternoonEnd = new Date(tomorrow)
      tomorrowAfternoonEnd.setHours(15, 0, 0, 0)

      const slot2 = await appointmentService.createServiceSlots({
        service_id: "consultation_60min",
        resource_id: "dr-vikram",
        resource_name: "Dr. Vikram (Senior Architect)",
        slot_start: tomorrowAfternoon,
        slot_end: tomorrowAfternoonEnd,
        max_capacity: 1,
        booked_count: 0,
        is_blocked: false,
      })

      logger.info(`Seeded 2 appointment slots: ${slot1.id} (10:00 AM), ${slot2.id} (2:00 PM)`)
    }

    // 3. Seed Events
    const existingEvents = await eventService.listEvents({})
    if (existingEvents.length === 0) {
      const eventDate = new Date()
      eventDate.setDate(eventDate.getDate() + 14)
      eventDate.setHours(9, 0, 0, 0)

      const eventEndDate = new Date(eventDate)
      eventEndDate.setHours(18, 0, 0, 0)

      const summit = await eventService.createEvents({
        title: "AI & Modern Commerce Summit 2026",
        description:
          "Keynotes, live coding workshops, and networking for full-stack engineering leaders.",
        venue: "Grand Convention Center, Hall 4 (Bangalore / Hybrid)",
        event_start: eventDate,
        event_end: eventEndDate,
        total_capacity: 150,
        tickets_issued: 0,
        status: "published",
      })

      logger.info(`Seeded event: ${summit.id} ("${summit.title}")`)
    }

    logger.info("Multi-Vertical demo seed completed successfully!")
  } catch (error: any) {
    logger.error(`Error running multi-vertical seed: ${error.message}`)
  }
}
