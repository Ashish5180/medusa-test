import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Sparkles } from "@medusajs/icons"
import { Container, Heading, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { ModuleSection } from "../../components/module-section"
import { formatDateTime } from "../../lib/format"
import { sdk } from "../../lib/sdk"

type EventItem = {
  id: string
  title?: string
  venue?: string
  event_start?: string
  total_capacity?: number
  tickets_issued?: number
  status?: string
}

type Ticket = {
  id: string
  event_id?: string
  attendee_name?: string
  ticket_code?: string
  qr_payload?: string
  order_id?: string
  ticket_tier?: string
  status?: string
}

type EventsResponse = {
  events?: EventItem[]
  tickets?: Ticket[]
}

const QUERY_KEY = ["admin", "events"]

const EventsPage = () => {
  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => sdk.client.fetch<EventsResponse>("/admin/events"),
  })
  const events = data?.events ?? []
  const bookable = events.filter(
    (event) =>
      event.status === "published" &&
      Number(event.tickets_issued ?? 0) < Number(event.total_capacity ?? 0)
  )

  return (
    <Container className="flex flex-col gap-y-4 p-0">
      <div className="px-6 py-4">
        <Heading>Events</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Each event is a catalog product (type: event). A mixed cart checkout issues a QR ticket automatically. Walk-in issue still works at the door.
        </Text>
      </div>
      <ModuleSection<EventItem>
        title="Events"
        hint="GET/POST /admin/events"
        queryKey={QUERY_KEY}
        listPath="/admin/events"
        pick={(payload) => (payload as EventsResponse).events ?? []}
        columns={[
          { header: "Title", cell: (row) => row.title || "—" },
          { header: "Venue", cell: (row) => row.venue || "—" },
          { header: "Start", cell: (row) => formatDateTime(row.event_start) },
          {
            header: "Tickets",
            cell: (row) => `${row.tickets_issued ?? 0}/${row.total_capacity ?? 0}`,
          },
          { header: "Status", cell: (row) => row.status || "—" },
        ]}
        fields={[
          { name: "title", label: "Title", required: true },
          { name: "venue", label: "Venue", required: true },
          { name: "event_start", label: "Start", type: "datetime", required: true },
          { name: "event_end", label: "End", type: "datetime", required: true },
          { name: "total_capacity", label: "Capacity", type: "number" },
        ]}
        emptyCreate={{ total_capacity: "100" }}
        createPath="/admin/events"
        createLabel="Create event"
        toCreate={(values) => ({
          title: values.title,
          venue: values.venue,
          event_start: values.event_start,
          event_end: values.event_end,
          total_capacity: Number(values.total_capacity || 100),
        })}
        deletePath={(row) => `/admin/events/${row.id}`}
      />
      <ModuleSection<Ticket>
        title="Tickets"
        hint="POST /admin/events/tickets"
        queryKey={QUERY_KEY}
        listPath="/admin/events"
        pick={(payload) => (payload as EventsResponse).tickets ?? []}
        columns={[
          {
            header: "Event",
            cell: (row) => events.find((event) => event.id === row.event_id)?.title || "—",
          },
          { header: "Attendee", cell: (row) => row.attendee_name || "—" },
          { header: "Code", cell: (row) => row.ticket_code || "—" },
          { header: "QR", cell: (row) => row.qr_payload || row.ticket_code || "—" },
          { header: "Order", cell: (row) => row.order_id?.slice(-8) || "—" },
          { header: "Tier", cell: (row) => row.ticket_tier || "—" },
          { header: "Status", cell: (row) => row.status || "—" },
        ]}
        fields={[
          {
            name: "eventId",
            label: "Event",
            type: "select",
            required: true,
            options: bookable.map((event) => ({
              label: event.title || event.id,
              value: event.id,
            })),
          },
          { name: "attendeeName", label: "Attendee name", required: true },
          { name: "attendeeEmail", label: "Email", type: "email" },
          { name: "ticketTier", label: "Tier" },
        ]}
        emptyCreate={{ ticketTier: "General Admission" }}
        createPath="/admin/events/tickets"
        createLabel="Issue ticket"
        toCreate={(values) => ({
          eventId: values.eventId,
          attendeeName: values.attendeeName,
          attendeeEmail: values.attendeeEmail,
          ticketTier: values.ticketTier || "General Admission",
        })}
        deletePath={(row) => `/admin/events/tickets/${row.id}`}
      />
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Events",
  icon: Sparkles,
  rank: 22,
})

export default EventsPage
