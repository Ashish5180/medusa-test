import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Calendar } from "@medusajs/icons"
import { Container, Heading, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { ModuleSection } from "../../components/module-section"
import { formatDateTime } from "../../lib/format"
import { sdk } from "../../lib/sdk"

type Slot = {
  id: string
  resource_name?: string
  slot_start?: string
  slot_end?: string
  max_capacity?: number
  booked_count?: number
  is_blocked?: boolean
}

type Booking = {
  id: string
  slot_id?: string
  customer_name?: string
  customer_email?: string
  status?: string
}

type CalendarResponse = {
  slots?: Slot[]
  bookings?: Booking[]
}

const QUERY_KEY = ["admin", "appointments"]

function slotLabel(slot: Slot) {
  return `${slot.resource_name || "Slot"} · ${formatDateTime(slot.slot_start)}`
}

const AppointmentsPage = () => {
  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => sdk.client.fetch<CalendarResponse>("/admin/appointments/calendar"),
  })
  const slots = data?.slots ?? []
  const openSlots = slots.filter(
    (slot) => !slot.is_blocked && Number(slot.booked_count ?? 0) < Number(slot.max_capacity ?? 1)
  )

  return (
    <Container className="flex flex-col gap-y-4 p-0">
      <div className="px-6 py-4">
        <Heading>Appointments</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Each slot is a catalog product (type: booking). Customers add it to the same cart as physical, rental, and event lines. Checkout locks the calendar.
        </Text>
      </div>
      <ModuleSection<Slot>
        title="Calendar slots"
        hint="GET/POST /admin/appointments/calendar"
        queryKey={QUERY_KEY}
        listPath="/admin/appointments/calendar"
        pick={(payload) => (payload as CalendarResponse).slots ?? []}
        columns={[
          { header: "Resource", cell: (row) => row.resource_name || "—" },
          { header: "Start", cell: (row) => formatDateTime(row.slot_start) },
          { header: "End", cell: (row) => formatDateTime(row.slot_end) },
          {
            header: "Booked",
            cell: (row) => `${row.booked_count ?? 0}/${row.max_capacity ?? 1}`,
          },
        ]}
        fields={[
          { name: "resource_name", label: "Resource name", required: true },
          { name: "slot_start", label: "Start", type: "datetime", required: true },
          { name: "slot_end", label: "End", type: "datetime", required: true },
          { name: "max_capacity", label: "Capacity", type: "number" },
        ]}
        emptyCreate={{ resource_name: "", max_capacity: "1" }}
        createPath="/admin/appointments/calendar"
        createLabel="Add slot"
        toCreate={(values) => ({
          resource_name: values.resource_name,
          slot_start: values.slot_start,
          slot_end: values.slot_end,
          max_capacity: Number(values.max_capacity || 1),
        })}
        deletePath={(row) => `/admin/appointments/calendar/${row.id}`}
      />
      <ModuleSection<Booking>
        title="Bookings"
        hint="POST /admin/appointments/bookings"
        queryKey={QUERY_KEY}
        listPath="/admin/appointments/calendar"
        pick={(payload) => (payload as CalendarResponse).bookings ?? []}
        columns={[
          { header: "Customer", cell: (row) => row.customer_name || "—" },
          { header: "Email", cell: (row) => row.customer_email || "—" },
          {
            header: "Slot",
            cell: (row) => {
              const slot = slots.find((entry) => entry.id === row.slot_id)
              return slot ? slotLabel(slot) : "—"
            },
          },
          { header: "Status", cell: (row) => row.status || "—" },
        ]}
        fields={[
          {
            name: "slotId",
            label: "Open slot",
            type: "select",
            required: true,
            options: openSlots.map((slot) => ({
              label: slotLabel(slot),
              value: slot.id,
            })),
          },
          { name: "customerName", label: "Customer name", required: true },
          { name: "customerEmail", label: "Email", type: "email" },
        ]}
        createPath="/admin/appointments/bookings"
        createLabel="Book slot"
        toCreate={(values) => ({
          slotId: values.slotId,
          customerName: values.customerName,
          customerEmail: values.customerEmail,
        })}
        deletePath={(row) => `/admin/appointments/bookings/${row.id}`}
      />
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Appointments",
  icon: Calendar,
  rank: 21,
})

export default AppointmentsPage
