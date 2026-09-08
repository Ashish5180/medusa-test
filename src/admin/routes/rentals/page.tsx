import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Clock } from "@medusajs/icons"
import { Container, Heading, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { ModuleSection } from "../../components/module-section"
import { formatDateTime, formatMoney } from "../../lib/format"
import { sdk } from "../../lib/sdk"

type RentalItem = {
  id: string
  daily_rate?: number
  deposit_amount?: number
  min_rental_days?: number
  condition_grade?: string
  is_active?: boolean
}

type RentalBooking = {
  id: string
  item_id?: string
  start_date?: string
  end_date?: string
  rental_status?: string
}

type RentalsResponse = {
  items?: RentalItem[]
  bookings?: RentalBooking[]
}

const QUERY_KEY = ["admin", "rentals"]

const RentalsPage = () => {
  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => sdk.client.fetch<RentalsResponse>("/admin/rentals"),
  })
  const items = data?.items ?? []

  return (
    <Container className="flex flex-col gap-y-4 p-0">
      <div className="px-6 py-4">
        <Heading>Rentals</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Custom rental module. Fleet rates are stored in cents; enter major units when creating.
        </Text>
      </div>
      <ModuleSection<RentalItem>
        title="Fleet"
        hint="GET/POST /admin/rentals"
        queryKey={QUERY_KEY}
        listPath="/admin/rentals"
        pick={(payload) => (payload as RentalsResponse).items ?? []}
        columns={[
          {
            header: "Item",
            cell: (row) => `${row.condition_grade || "Item"} · ${row.id.slice(-6)}`,
          },
          { header: "Daily rate", cell: (row) => formatMoney(row.daily_rate) },
          { header: "Deposit", cell: (row) => formatMoney(row.deposit_amount) },
          { header: "Min days", cell: (row) => String(row.min_rental_days ?? 1) },
          { header: "Active", cell: (row) => (row.is_active === false ? "No" : "Yes") },
        ]}
        fields={[
          { name: "daily_rate", label: "Daily rate", type: "number", step: "0.01", required: true },
          { name: "deposit_amount", label: "Deposit", type: "number", step: "0.01", required: true },
          { name: "min_rental_days", label: "Min days", type: "number" },
          { name: "condition_grade", label: "Condition" },
        ]}
        emptyCreate={{
          daily_rate: "25",
          deposit_amount: "100",
          min_rental_days: "1",
          condition_grade: "Excellent",
        }}
        createPath="/admin/rentals"
        createLabel="Add item"
        toCreate={(values) => ({
          daily_rate: Number(values.daily_rate),
          deposit_amount: Number(values.deposit_amount),
          min_rental_days: Number(values.min_rental_days || 1),
          condition_grade: values.condition_grade || "Excellent",
        })}
        deletePath={(row) => `/admin/rentals/${row.id}`}
      />
      <ModuleSection<RentalBooking>
        title="Bookings"
        hint="POST /admin/rentals/bookings"
        queryKey={QUERY_KEY}
        listPath="/admin/rentals"
        pick={(payload) => (payload as RentalsResponse).bookings ?? []}
        columns={[
          {
            header: "Item",
            cell: (row) => {
              const item = items.find((entry) => entry.id === row.item_id)
              return item ? item.condition_grade || item.id.slice(-6) : row.item_id?.slice(-6) || "—"
            },
          },
          { header: "Start", cell: (row) => formatDateTime(row.start_date) },
          { header: "End", cell: (row) => formatDateTime(row.end_date) },
          { header: "Status", cell: (row) => row.rental_status || "—" },
        ]}
        fields={[
          {
            name: "itemId",
            label: "Fleet item",
            type: "select",
            required: true,
            options: items.map((item) => ({
              label: `${item.condition_grade || "Item"} · ${formatMoney(item.daily_rate)}/day`,
              value: item.id,
            })),
          },
          { name: "startDate", label: "Start", type: "datetime", required: true },
          { name: "endDate", label: "End", type: "datetime", required: true },
        ]}
        createPath="/admin/rentals/bookings"
        createLabel="Create booking"
        toCreate={(values) => ({
          itemId: values.itemId,
          startDate: values.startDate,
          endDate: values.endDate,
        })}
        deletePath={(row) => `/admin/rentals/bookings/${row.id}`}
      />
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Rentals",
  icon: Clock,
  rank: 20,
})

export default RentalsPage
