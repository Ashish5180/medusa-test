import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import { Badge, Container, Heading, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { formatMoney } from "../lib/format"
import { sdk } from "../lib/sdk"

type RentalItem = {
  id: string
  daily_rate?: number
  hourly_rate?: number
  deposit_amount?: number
  rental_duration_type?: string
  late_fee_per_day?: number
  min_rental_days?: number
  minimum_rental_period?: number
  max_rental_days?: number
  condition_grade?: string
}

type Booking = {
  id: string
  item_id?: string
  start_date?: string
  end_date?: string
  rental_status?: string
  return_status?: string
}

/**
 * Official recipe: rental config lives on the product details page so staff
 * can see duration, deposit, and dates already reserved.
 */
const ProductRentalWidget = ({ data }: DetailWidgetProps<HttpTypes.AdminProduct>) => {
  const rentalItemId = data.metadata?.rental_item_id
  const isRental =
    data.metadata?.type === "rental" ||
    data.metadata?.vertical === "rental" ||
    Boolean(rentalItemId)

  const { data: rentals } = useQuery({
    queryKey: ["admin", "rentals", "product-widget"],
    queryFn: () =>
      sdk.client.fetch<{ items?: RentalItem[]; bookings?: Booking[] }>("/admin/rentals"),
    enabled: isRental,
  })

  if (!isRental) {
    return null
  }

  const item =
    (rentals?.items ?? []).find((entry) => entry.id === rentalItemId) ||
    (rentals?.items ?? []).find((entry) =>
      (data.handle || "").includes(entry.id.toLowerCase())
    )
  const bookings = (rentals?.bookings ?? []).filter(
    (booking) =>
      booking.item_id === item?.id &&
      ["reserved", "active", "overdue"].includes(booking.rental_status || "")
  )

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Rental</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Linked fleet item. Cart charges a non-refundable fee plus a refundable deposit.
        </Text>
      </div>
      <div className="flex flex-col gap-y-2 px-6 py-4">
        {item ? (
          <>
            <Text size="small">
              <strong>{item.condition_grade || "Item"}</strong> · {item.rental_duration_type || "daily"}
            </Text>
            <Text size="small">
              Rate {formatMoney(item.rental_duration_type === "hourly" ? item.hourly_rate : item.daily_rate)}{" "}
              / {item.rental_duration_type === "hourly" ? "hr" : "day"} · deposit{" "}
              {formatMoney(item.deposit_amount)} · late {formatMoney(item.late_fee_per_day)}/day
            </Text>
            <Text size="small" className="text-ui-fg-subtle">
              Min {item.minimum_rental_period ?? item.min_rental_days ?? 1} · max{" "}
              {item.max_rental_days ?? 5} days
            </Text>
          </>
        ) : (
          <Text size="small" className="text-ui-fg-subtle">
            This product is marked as a rental. Open Rentals in the sidebar to edit rates.
          </Text>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          {bookings.length ? (
            bookings.map((booking) => (
              <Badge key={booking.id} size="2xsmall" color="orange">
                {(booking.start_date || "").slice(0, 10)} → {(booking.end_date || "").slice(0, 10)}{" "}
                · {booking.return_status || booking.rental_status}
              </Badge>
            ))
          ) : (
            <Badge size="2xsmall" color="green">
              No reserved dates
            </Badge>
          )}
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductRentalWidget
