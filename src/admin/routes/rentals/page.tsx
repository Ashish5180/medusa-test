import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Clock } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ModuleSection } from "../../components/module-section"
import { formatDateTime, formatMoney } from "../../lib/format"
import { sdk } from "../../lib/sdk"

type RentalItem = {
  id: string
  daily_rate?: number
  hourly_rate?: number
  deposit_amount?: number
  rental_duration_type?: "hourly" | "daily"
  min_rental_days?: number
  max_rental_days?: number
  minimum_rental_period?: number
  late_fee_per_day?: number
  condition_grade?: string
  is_active?: boolean
}

type RentalBooking = {
  id: string
  item_id?: string
  start_date?: string
  end_date?: string
  rental_status?: string
  return_status?: string
  late_fee?: number
  deposit_amount?: number
  total_rental_fee?: number
}

type RentalsResponse = {
  items?: RentalItem[]
  bookings?: RentalBooking[]
}

const QUERY_KEY = ["admin", "rentals"]

function itemName(item: RentalItem) {
  return item.condition_grade || "Rental item"
}

function BookingAction({
  label,
  path,
  body,
  onDone,
}: {
  label: string
  path: string
  body: Record<string, unknown>
  onDone: () => void
}) {
  const mutation = useMutation({
    mutationFn: () => sdk.client.fetch(path, { method: "POST", body }),
    onSuccess: () => {
      toast.success(label)
      onDone()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Button
      size="small"
      variant="secondary"
      isLoading={mutation.isPending}
      onClick={() => mutation.mutate()}
    >
      {label}
    </Button>
  )
}

const RentalsPage = () => {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => sdk.client.fetch<RentalsResponse>("/admin/rentals"),
  })
  const items = data?.items ?? []

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY })
  }

  return (
    <Container className="flex flex-col gap-y-4 p-0">
      <div className="px-6 py-4">
        <Heading>Rentals</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Fleet items are catalog products (type: rental) and share the same cart as
          physical, booking, and event lines. Fee is non-refundable; deposit is held and
          released on return, minus late or damage charges.
        </Text>
      </div>

      <ModuleSection<RentalItem>
        title="Fleet"
        hint="GET/POST /admin/rentals · variant-linked catalog item + late fee"
        queryKey={QUERY_KEY}
        listPath="/admin/rentals"
        pick={(payload) => (payload as RentalsResponse).items ?? []}
        columns={[
          {
            header: "Item",
            cell: (row) => `${itemName(row)} · ${row.id.slice(-6)}`,
          },
          {
            header: "Rate",
            cell: (row) =>
              row.rental_duration_type === "hourly"
                ? `${formatMoney(row.hourly_rate || row.daily_rate)}/hr`
                : `${formatMoney(row.daily_rate)}/day`,
          },
          { header: "Deposit", cell: (row) => formatMoney(row.deposit_amount) },
          { header: "Late / day", cell: (row) => formatMoney(row.late_fee_per_day) },
          {
            header: "Period",
            cell: (row) =>
              `${row.minimum_rental_period ?? row.min_rental_days ?? 1}–${row.max_rental_days ?? 5} ${
                row.rental_duration_type === "hourly" ? "hrs" : "days"
              }`,
          },
          {
            header: "Bookable",
            cell: (row) => (row.is_active === false ? "No" : "Yes"),
          },
        ]}
        fields={[
          { name: "condition_grade", label: "Item / condition", required: true },
          {
            name: "rental_duration_type",
            label: "Duration type",
            type: "select",
            options: [
              { label: "Daily", value: "daily" },
              { label: "Hourly", value: "hourly" },
            ],
          },
          { name: "daily_rate", label: "Daily rate", type: "number", step: "0.01", required: true },
          { name: "hourly_rate", label: "Hourly rate", type: "number", step: "0.01" },
          {
            name: "deposit_amount",
            label: "Security deposit",
            type: "number",
            step: "0.01",
            required: true,
          },
          { name: "late_fee_per_day", label: "Late fee / day", type: "number", step: "0.01" },
          { name: "min_rental_days", label: "Minimum period", type: "number" },
          { name: "max_rental_days", label: "Maximum days", type: "number" },
        ]}
        emptyCreate={{
          daily_rate: "25",
          hourly_rate: "5",
          rental_duration_type: "daily",
          deposit_amount: "100",
          late_fee_per_day: "15",
          min_rental_days: "1",
          max_rental_days: "5",
          condition_grade: "Excellent",
        }}
        createPath="/admin/rentals"
        createLabel="Add item"
        toCreate={(values) => ({
          daily_rate: Number(values.daily_rate),
          hourly_rate: Number(values.hourly_rate || 0),
          rental_duration_type: values.rental_duration_type || "daily",
          deposit_amount: Number(values.deposit_amount),
          late_fee_per_day: Number(values.late_fee_per_day || 0),
          min_rental_days: Number(values.min_rental_days || 1),
          minimum_rental_period: Number(values.min_rental_days || 1),
          max_rental_days: Number(values.max_rental_days || 5),
          condition_grade: values.condition_grade || "Excellent",
        })}
        deletePath={(row) => `/admin/rentals/${row.id}`}
      />

      <ModuleSection<RentalBooking>
        title="Bookings"
        hint="Walk-in create checks date overlap. Fulfillment marks rented out. Return refunds the deposit unless late/damage fees apply."
        queryKey={QUERY_KEY}
        listPath="/admin/rentals"
        pick={(payload) => (payload as RentalsResponse).bookings ?? []}
        columns={[
          {
            header: "Item",
            cell: (row) => {
              const item = items.find((entry) => entry.id === row.item_id)
              return item ? itemName(item) : row.item_id?.slice(-6) || "—"
            },
          },
          { header: "Start", cell: (row) => formatDateTime(row.start_date) },
          { header: "End", cell: (row) => formatDateTime(row.end_date) },
          {
            header: "Fee / deposit",
            cell: (row) =>
              `${formatMoney(row.total_rental_fee)} fee · ${formatMoney(row.deposit_amount)} deposit`,
          },
          {
            header: "Status",
            cell: (row) => (
              <Badge size="2xsmall" color="grey">
                {row.rental_status || "—"}
              </Badge>
            ),
          },
          {
            header: "Return",
            cell: (row) => (
              <Badge
                size="2xsmall"
                color={
                  row.return_status === "damaged" || row.return_status === "late"
                    ? "orange"
                    : row.return_status === "returned"
                      ? "green"
                      : "grey"
                }
              >
                {row.return_status || row.rental_status || "pending"}
              </Badge>
            ),
          },
        ]}
        fields={[
          {
            name: "itemId",
            label: "Fleet item",
            type: "select",
            required: true,
            options: items.map((item) => ({
              label: `${itemName(item)} · ${formatMoney(item.daily_rate)}/${
                item.rental_duration_type === "hourly" ? "hr" : "day"
              }`,
              value: item.id,
            })),
          },
          { name: "startDate", label: "Start", type: "datetime", required: true },
          { name: "endDate", label: "End", type: "datetime", required: true },
        ]}
        createPath="/admin/rentals/bookings"
        createLabel="Walk-in booking"
        toCreate={(values) => ({
          itemId: values.itemId,
          startDate: values.startDate,
          endDate: values.endDate,
        })}
        deletePath={(row) => `/admin/rentals/bookings/${row.id}`}
        rowActions={(row, { refresh: reload }) => (
          <>
            {row.rental_status === "reserved" ? (
              <BookingAction
                label="Picked up"
                path={`/admin/rentals/bookings/${row.id}`}
                body={{ rental_status: "active" }}
                onDone={() => {
                  reload()
                  refresh()
                }}
              />
            ) : null}
            {row.rental_status === "active" || row.rental_status === "overdue" ? (
              <>
                <BookingAction
                  label="Returned"
                  path={`/admin/rentals/bookings/${row.id}`}
                  body={{
                    rental_status: "returned",
                    condition_on_return: "Good",
                    late_fee: row.late_fee ?? 0,
                  }}
                  onDone={() => {
                    reload()
                    refresh()
                  }}
                />
                <BookingAction
                  label="Damaged"
                  path={`/admin/rentals/bookings/${row.id}`}
                  body={{
                    rental_status: "returned",
                    condition_on_return: "Damaged",
                    damage_fee: 50,
                    late_fee: row.late_fee ?? 0,
                  }}
                  onDone={() => {
                    reload()
                    refresh()
                  }}
                />
              </>
            ) : null}
          </>
        )}
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
