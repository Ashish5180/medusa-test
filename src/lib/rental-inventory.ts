import type { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createReservationsWorkflow,
  deleteReservationsWorkflow,
} from "@medusajs/medusa/core-flows"
import { firstVariantId, getProductForRentalItem } from "./vertical-catalog"
import { RENTAL_MODULE } from "../modules/rental"
import RentalModuleService from "../modules/rental/service"

type InventoryTarget = {
  variantId: string
  inventoryItemId: string
  locationId: string
}

async function findInventoryTarget(
  container: MedusaContainer,
  rentalItemId: string
): Promise<InventoryTarget | null> {
  try {
    const product = await getProductForRentalItem(container, rentalItemId)
    const variantId = firstVariantId(product)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: variants } = await query.graph({
      entity: "variant",
      fields: [
        "id",
        "inventory_items.inventory_item_id",
        "inventory_items.inventory_item.id",
        "inventory_items.inventory.id",
        "inventory.location_levels.location_id",
        "inventory.location_levels.stocked_quantity",
      ],
      filters: { id: variantId },
    })

    const variant = variants[0] as
      | {
          inventory_items?: Array<{
            inventory_item_id?: string
            inventory_item?: { id?: string }
            inventory?: { id?: string }
          }>
          inventory?: Array<{
            location_levels?: Array<{ location_id?: string }>
          }>
        }
      | undefined

    const inventoryItemId =
      variant?.inventory_items?.[0]?.inventory_item_id ||
      variant?.inventory_items?.[0]?.inventory_item?.id ||
      variant?.inventory_items?.[0]?.inventory?.id

    let locationId = variant?.inventory?.[0]?.location_levels?.[0]?.location_id

    if (!locationId) {
      const { data: locations } = await query.graph({
        entity: "stock_location",
        fields: ["id"],
        pagination: { take: 1 },
      })
      locationId = (locations[0] as { id?: string } | undefined)?.id
    }

    if (!inventoryItemId || !locationId) {
      return null
    }

    return { variantId, inventoryItemId, locationId }
  } catch {
    return null
  }
}

/**
 * Locks one unit of the rental's inventory item for the booked window.
 * No-ops when the variant has no inventory item or stock location — date
 * overlap on rental_booking still blocks double-booking.
 */
export async function reserveRentalInventory(
  container: MedusaContainer,
  bookingId: string
) {
  const rentalService: RentalModuleService = container.resolve(RENTAL_MODULE)
  const booking = await rentalService.retrieveRentalBooking(bookingId)
  if (booking.inventory_reservation_id) {
    return booking.inventory_reservation_id
  }

  const target = await findInventoryTarget(container, booking.item_id)
  if (!target) {
    return null
  }

  const { result } = await createReservationsWorkflow(container).run({
    input: {
      reservations: [
        {
          inventory_item_id: target.inventoryItemId,
          location_id: target.locationId,
          quantity: 1,
          line_item_id: booking.fee_line_item_id || undefined,
          description: `Rental ${booking.id} ${booking.start_date} → ${booking.end_date}`,
        },
      ],
    },
  })

  const reservationId = (result as Array<{ id?: string }>)?.[0]?.id
  if (!reservationId) {
    return null
  }

  await rentalService.updateRentalBookings({
    id: bookingId,
    variant_id: target.variantId,
    inventory_reservation_id: reservationId,
  })

  return reservationId
}

export async function releaseRentalInventory(
  container: MedusaContainer,
  bookingId: string
) {
  const rentalService: RentalModuleService = container.resolve(RENTAL_MODULE)
  const booking = await rentalService.retrieveRentalBooking(bookingId)
  if (!booking.inventory_reservation_id) {
    return
  }

  try {
    await deleteReservationsWorkflow(container).run({
      input: { ids: [booking.inventory_reservation_id] },
    })
  } catch {
    // Already released or inventory module unavailable.
  }

  await rentalService.updateRentalBookings({
    id: bookingId,
    inventory_reservation_id: null,
  })
}
