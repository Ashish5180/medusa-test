import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows"
import { ensureRentalCatalogProduct } from "../lib/vertical-catalog"
import { APPOINTMENT_MODULE } from "../modules/appointment"
import AppointmentModuleService from "../modules/appointment/service"
import { RENTAL_MODULE } from "../modules/rental"
import RentalModuleService from "../modules/rental/service"
import completeAppointmentWorkflow from "../workflows/appointments/complete-appointment"
import createServiceSlotWorkflow from "../workflows/appointments/create-service-slot"
import completeRentalWorkflow from "../workflows/rentals/complete-rental"
import startRentalWorkflow from "../workflows/rentals/start-rental"

export default async function completeMixedCartTest({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const rentalService: RentalModuleService = container.resolve(RENTAL_MODULE)
  const appointmentService: AppointmentModuleService =
    container.resolve(APPOINTMENT_MODULE)

  logger.info("Adding EUR price to winter jacket variant...")
  await updateProductVariantsWorkflow(container).run({
    input: {
      product_variants: [
        {
          id: "variant_01M1NYKTX44BABTQ22VFWV62E7",
          prices: [
            { amount: 49, currency_code: "eur" },
            { amount: 55, currency_code: "usd" },
          ],
        },
      ],
    },
  })

  const camera = await rentalService.retrieveRentalItem("01M1NYVEWE16AMTZ1Z7SEW3TEA")
  if (Number(camera.daily_rate) < 100) {
    await rentalService.updateRentalItems({
      id: camera.id,
      daily_rate: 7500,
      deposit_amount: 30000,
      min_rental_days: 1,
      max_rental_days: 5,
    })
    logger.info("Updated camera rental rates to €75/day + €300 deposit")
  }

  const { result: slot } = await createServiceSlotWorkflow(container).run({
    input: {
      serviceId: "prod_01M22ZFDG366RRD58KR33C97J5",
      productId: "prod_01M22ZFDG366RRD58KR33C97J5",
      resourceName: "Dr. Vikram (3-way cart)",
      slotStart: "2026-09-23T10:00:00.000Z",
      slotEnd: "2026-09-23T11:00:00.000Z",
      maxCapacity: 1,
    },
  })

  const fleet = await rentalService.listRentalItems({})
  for (const item of fleet) {
    const product = await ensureRentalCatalogProduct(container, item)
    logger.info(`Rental item ${item.id} sellable as ${product.id} (${product.title})`)
  }

  logger.info(`Ready for 3-way cart. Slot ${slot.id}`)
  logger.info("Winter jacket now has EUR 49. Use store API to add jacket + this slot + a free rental window.")

  const openAppointments = await appointmentService.listAppointmentBookings({
    status: ["confirmed"],
  })
  const reservedRentals = await rentalService.listRentalBookings({
    rental_status: ["reserved"],
  })

  const latestAppointment = openAppointments
    .filter((booking) => booking.order_id)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0]
  const latestRental = reservedRentals
    .filter((booking) => booking.order_id)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0]

  if (latestAppointment) {
    const { result } = await completeAppointmentWorkflow(container).run({
      input: { bookingId: latestAppointment.id },
    })
    logger.info(`Completed appointment ${result.id} → ${result.status}`)
  }

  if (latestRental) {
    const started = await startRentalWorkflow(container).run({
      input: { bookingId: latestRental.id, conditionOnPickup: "Good on pickup" },
    })
    logger.info(`Started rental ${started.result.id} → ${started.result.rental_status}`)
    const finished = await completeRentalWorkflow(container).run({
      input: {
        bookingId: latestRental.id,
        conditionOnReturn: "Clean return, no damage",
        damageFee: 0,
      },
    })
    logger.info(
      `Returned rental ${finished.result.booking.id} → ${finished.result.booking.rental_status} / ${finished.result.booking.deposit_status}`
    )
  }
}
