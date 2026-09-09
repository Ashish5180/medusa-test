import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import { ensureRentalCatalogProduct } from "../lib/vertical-catalog"
import { APPOINTMENT_MODULE } from "../modules/appointment"
import AppointmentModuleService from "../modules/appointment/service"
import { EVENT_MODULE } from "../modules/event"
import EventModuleService from "../modules/event/service"
import { RENTAL_MODULE } from "../modules/rental"
import RentalModuleService from "../modules/rental/service"

export default async function seedMultiVerticalData({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  logger.info("Starting Multi-Vertical seed (Rentals, Appointments, Events)...")

  try {
    const rentalService: RentalModuleService = container.resolve(RENTAL_MODULE)
    const appointmentService: AppointmentModuleService =
      container.resolve(APPOINTMENT_MODULE)
    const eventService: EventModuleService = container.resolve(EVENT_MODULE)

    const { data: shippingProfiles } = await query.graph({
      entity: "shipping_profile",
      fields: ["id"],
    })
    const { data: salesChannels } = await query.graph({
      entity: "sales_channel",
      fields: ["id"],
    })
    const shippingProfileId = shippingProfiles[0]?.id
    const salesChannelId = salesChannels[0]?.id

    let camera = (await rentalService.listRentalItems({}))[0]
    let projector = (await rentalService.listRentalItems({}))[1]

    if (!camera) {
      camera = await rentalService.createRentalItems({
        deposit_amount: 30000,
        daily_rate: 7500,
        min_rental_days: 1,
        max_rental_days: 5,
        condition_grade: "Mint / Professional",
        is_active: true,
      })
      projector = await rentalService.createRentalItems({
        deposit_amount: 15000,
        daily_rate: 4500,
        min_rental_days: 1,
        max_rental_days: 5,
        condition_grade: "Excellent",
        is_active: true,
      })
      logger.info(`Seeded rental items: ${camera.id}, ${projector.id}`)
    }

    const { data: existingProducts } = await query.graph({
      entity: "product",
      fields: ["id", "handle"],
    })
    const handles = new Set(existingProducts.map((product: { handle?: string }) => product.handle))

    const productsToCreate = [
      !handles.has("rental-cinema-camera") && {
        title: "Sony Cinema FX3 Rental",
        handle: "rental-cinema-camera",
        description: "Professional cinema camera. Daily rate plus refundable deposit.",
        status: ProductStatus.PUBLISHED,
        discountable: false,
        metadata: { vertical: "rental" },
        shipping_profile_id: shippingProfileId,
        sales_channels: salesChannelId ? [{ id: salesChannelId }] : [],
        options: [{ title: "Term", values: ["Daily"] }],
        variants: [
          {
            title: "Daily",
            sku: "RENT-FX3-DAILY",
            options: { Term: "Daily" },
            manage_inventory: false,
            prices: [
              { amount: 75, currency_code: "eur" },
              { amount: 80, currency_code: "usd" },
            ],
          },
        ],
      },
      !handles.has("consult-60min") && {
        title: "60-min Architecture Consult",
        handle: "consult-60min",
        description: "One-hour consultation. Payment is authorized at checkout and captured after the visit.",
        status: ProductStatus.PUBLISHED,
        discountable: false,
        metadata: { vertical: "appointment" },
        shipping_profile_id: shippingProfileId,
        sales_channels: salesChannelId ? [{ id: salesChannelId }] : [],
        options: [{ title: "Session", values: ["60min"] }],
        variants: [
          {
            title: "60 minutes",
            sku: "APPT-CONSULT-60",
            options: { Session: "60min" },
            manage_inventory: false,
            prices: [
              { amount: 150, currency_code: "eur" },
              { amount: 160, currency_code: "usd" },
            ],
          },
        ],
      },
    ].filter(Boolean)

    let createdProducts: Array<{ id: string; handle?: string }> = []
    if (productsToCreate.length) {
      const { result } = await createProductsWorkflow(container).run({
        input: { products: productsToCreate as any },
      })
      createdProducts = result
    }

    const allProducts = [...existingProducts, ...createdProducts] as Array<{
      id: string
      handle?: string
    }>
    const cameraProduct = allProducts.find((product) => product.handle === "rental-cinema-camera")
    const consultProduct = allProducts.find((product) => product.handle === "consult-60min")

    if (cameraProduct && camera) {
      try {
        await link.create({
          [Modules.PRODUCT]: { product_id: cameraProduct.id },
          [RENTAL_MODULE]: { rental_item_id: camera.id },
        })
      } catch {
        logger.info("Camera rental product link already exists")
      }
    }

    const fleet = await rentalService.listRentalItems({})
    for (const item of fleet) {
      const product = await ensureRentalCatalogProduct(container, item)
      logger.info(`Rental item ${item.id} is sellable as ${product.id}`)
    }

    const existingSlots = await appointmentService.listServiceSlots({})
    if (existingSlots.length === 0 && consultProduct) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 2)
      tomorrow.setHours(10, 0, 0, 0)
      const tomorrowEnd = new Date(tomorrow)
      tomorrowEnd.setHours(11, 0, 0, 0)

      const slot1 = await appointmentService.createServiceSlots({
        service_id: consultProduct.id,
        product_id: consultProduct.id,
        resource_id: "dr-vikram",
        resource_name: "Dr. Vikram (Senior Architect)",
        slot_start: tomorrow,
        slot_end: tomorrowEnd,
        max_capacity: 1,
        booked_count: 0,
        is_blocked: false,
      })

      const afternoon = new Date(tomorrow)
      afternoon.setHours(14, 0, 0, 0)
      const afternoonEnd = new Date(tomorrow)
      afternoonEnd.setHours(15, 0, 0, 0)

      const slot2 = await appointmentService.createServiceSlots({
        service_id: consultProduct.id,
        product_id: consultProduct.id,
        resource_id: "dr-vikram",
        resource_name: "Dr. Vikram (Senior Architect)",
        slot_start: afternoon,
        slot_end: afternoonEnd,
        max_capacity: 1,
        booked_count: 0,
        is_blocked: false,
      })

      await link.create({
        [Modules.PRODUCT]: { product_id: consultProduct.id },
        [APPOINTMENT_MODULE]: { service_slot_id: slot1.id },
      })
      await link.create({
        [Modules.PRODUCT]: { product_id: consultProduct.id },
        [APPOINTMENT_MODULE]: { service_slot_id: slot2.id },
      })

      logger.info(`Seeded appointment slots ${slot1.id}, ${slot2.id} on ${consultProduct.id}`)
    }

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
    throw error
  }
}
