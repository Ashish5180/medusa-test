import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ensureEventCatalogProduct } from "../lib/vertical-catalog"
import { EVENT_MODULE } from "../modules/event"
import EventModuleService from "../modules/event/service"

export default async function backfillEventProducts({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const eventService: EventModuleService = container.resolve(EVENT_MODULE)
  const events = await eventService.listEvents({})

  for (const event of events) {
    try {
      const product = await ensureEventCatalogProduct(container, event)
      logger.info(`Event "${event.title}" sellable as ${product.id}`)
    } catch (err) {
      logger.warn(
        `Could not link event ${event.id}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }
}
