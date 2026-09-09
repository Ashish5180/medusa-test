import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import { Badge, Container, Heading, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { sdk } from "../lib/sdk"

const ProductBookingWidget = ({ data }: DetailWidgetProps<HttpTypes.AdminProduct>) => {
  const isBooking =
    data.metadata?.type === "booking" || data.metadata?.vertical === "appointment"

  const { data: calendar } = useQuery({
    queryKey: ["admin", "appointments", "product-widget"],
    queryFn: () =>
      sdk.client.fetch<{
        slots?: Array<{
          id: string
          product_id?: string
          slot_start?: string
          slot_end?: string
          booked_count?: number
          max_capacity?: number
          is_blocked?: boolean
        }>
      }>("/admin/appointments/calendar"),
    enabled: isBooking,
  })

  if (!isBooking) {
    return null
  }

  const slots = (calendar?.slots ?? []).filter((slot) => slot.product_id === data.id)

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Booking</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Catalog type: booking. Slots lock at add-to-cart. Checkout confirms the appointment.
        </Text>
      </div>
      <div className="flex flex-col gap-y-2 px-6 py-4">
        {slots.length ? (
          slots.slice(0, 8).map((slot) => (
            <div key={slot.id} className="flex items-center justify-between gap-2">
              <Text size="small">
                {(slot.slot_start || "").slice(0, 16)} → {(slot.slot_end || "").slice(11, 16)}
              </Text>
              <Badge size="2xsmall" color={slot.is_blocked ? "red" : "green"}>
                {slot.booked_count ?? 0}/{slot.max_capacity ?? 1}
              </Badge>
            </div>
          ))
        ) : (
          <Text size="small" className="text-ui-fg-subtle">
            No slots linked yet. Open Appointments to add one.
          </Text>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductBookingWidget
