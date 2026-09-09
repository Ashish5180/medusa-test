import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import { Badge, Container, Heading, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { sdk } from "../lib/sdk"

const ProductEventWidget = ({ data }: DetailWidgetProps<HttpTypes.AdminProduct>) => {
  const eventId = data.metadata?.event_id
  const isEvent = data.metadata?.type === "event" || data.metadata?.vertical === "event"

  const { data: payload } = useQuery({
    queryKey: ["admin", "events", "product-widget"],
    queryFn: () =>
      sdk.client.fetch<{
        events?: Array<{
          id: string
          title?: string
          venue?: string
          tickets_issued?: number
          total_capacity?: number
        }>
        tickets?: Array<{ id: string; event_id?: string; ticket_code?: string; qr_payload?: string }>
      }>("/admin/events"),
    enabled: isEvent,
  })

  if (!isEvent) {
    return null
  }

  const event = (payload?.events ?? []).find((entry) => entry.id === eventId)
  const tickets = (payload?.tickets ?? []).filter((ticket) => ticket.event_id === event?.id)

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Event ticket</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Catalog type: event. Add via POST /store/carts/:id/line-items/event. Checkout issues a QR.
        </Text>
      </div>
      <div className="flex flex-col gap-y-2 px-6 py-4">
        {event ? (
          <>
            <Text size="small">
              <strong>{event.title}</strong> · {event.venue}
            </Text>
            <Text size="small">
              {event.tickets_issued ?? 0}/{event.total_capacity ?? 0} issued
            </Text>
          </>
        ) : (
          <Text size="small" className="text-ui-fg-subtle">
            Linked event is not loaded yet. Open Events in the sidebar.
          </Text>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          {tickets.slice(0, 6).map((ticket) => (
            <Badge key={ticket.id} size="2xsmall">
              {ticket.qr_payload || ticket.ticket_code}
            </Badge>
          ))}
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductEventWidget
