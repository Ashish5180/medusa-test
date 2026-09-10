import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BuildingStorefront, CheckCircle, ExclamationCircle, XCircle } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ModuleSection } from "../../components/module-section"
import { formatDateTime } from "../../lib/format"
import { sdk } from "../../lib/sdk"

type Vendor = {
  id: string
  name: string
  handle: string
  email?: string | null
  description?: string | null
  logo?: string | null
  status?: "pending_approval" | "active" | "suspended"
  commission_rate?: number
  is_platform?: boolean
  is_active?: boolean
  created_at?: string
}

type VendorsResponse = {
  vendors?: Vendor[]
}

const QUERY_KEY = ["admin", "vendors"]

function VendorStatusBadge({ status }: { status?: string }) {
  if (status === "active") {
    return (
      <Badge color="green" size="small" className="gap-x-1">
        <CheckCircle className="h-3 w-3" />
        Active
      </Badge>
    )
  }
  if (status === "pending_approval") {
    return (
      <Badge color="orange" size="small" className="gap-x-1">
        <ExclamationCircle className="h-3 w-3" />
        Pending Approval
      </Badge>
    )
  }
  if (status === "suspended") {
    return (
      <Badge color="red" size="small" className="gap-x-1">
        <XCircle className="h-3 w-3" />
        Suspended
      </Badge>
    )
  }
  return <Badge color="grey" size="small">{status || "Unknown"}</Badge>
}

const VendorsPage = () => {
  const queryClient = useQueryClient()

  const approveMutation = useMutation({
    mutationFn: (vendorId: string) =>
      sdk.client.fetch(`/admin/vendors/${vendorId}/approve`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Vendor approved and activated successfully")
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
    onError: (err: any) => toast.error(err?.message || "Failed to approve vendor"),
  })

  const suspendMutation = useMutation({
    mutationFn: (vendorId: string) =>
      sdk.client.fetch(`/admin/vendors/${vendorId}/suspend`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Vendor suspended")
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
    onError: (err: any) => toast.error(err?.message || "Failed to suspend vendor"),
  })

  return (
    <div className="flex flex-col gap-y-6">
      <Container className="p-6">
        <div className="flex items-center gap-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ui-bg-subtle text-ui-fg-base">
            <BuildingStorefront className="h-5 w-5" />
          </div>
          <div>
            <Heading level="h1">Multi-Vendor Marketplace</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Manage registered marketplace merchants, review onboarding applications, set commission rates, and manage store statuses.
            </Text>
          </div>
        </div>
      </Container>

      <ModuleSection<Vendor>
        title="Vendors"
        hint="Approved merchants, pending onboarding applications, and suspended storefronts."
        queryKey={QUERY_KEY}
        listPath="/admin/vendors"
        pick={(data) => (data as VendorsResponse).vendors ?? []}
        createLabel="Add Vendor"
        createPath="/admin/vendors"
        toCreate={(values) => ({
          name: values.name,
          handle: values.handle,
          email: values.email || undefined,
          description: values.description || undefined,
          commission_rate: values.commission_rate ? Number(values.commission_rate) : 15,
          status: values.status || "active",
        })}
        fields={[
          { name: "name", label: "Store / Vendor Name", required: true },
          { name: "handle", label: "Handle (Slug)", required: true },
          { name: "email", label: "Merchant Contact Email", type: "email" },
          { name: "description", label: "Description / Bio" },
          { name: "commission_rate", label: "Platform Commission (%)", type: "number", step: "1" },
          {
            name: "status",
            label: "Initial Status",
            type: "select",
            options: [
              { label: "Active", value: "active" },
              { label: "Pending Approval", value: "pending_approval" },
              { label: "Suspended", value: "suspended" },
            ],
          },
        ]}
        emptyCreate={{ commission_rate: "15", status: "active" }}
        columns={[
          {
            header: "Vendor",
            cell: (row) => (
              <div className="flex flex-col">
                <Text weight="plus" size="small">
                  {row.name}
                </Text>
                <Text size="xsmall" className="text-ui-fg-muted font-mono">
                  @{row.handle}
                </Text>
              </div>
            ),
          },
          {
            header: "Status",
            cell: (row) => <VendorStatusBadge status={row.status} />,
          },
          {
            header: "Commission",
            cell: (row) => (
              <Badge color="grey" size="small">
                {row.commission_rate ?? 15}%
              </Badge>
            ),
          },
          {
            header: "Contact",
            cell: (row) => (
              <Text size="small" className="text-ui-fg-subtle">
                {row.email || "—"}
              </Text>
            ),
          },
          {
            header: "Created",
            cell: (row) => (
              <Text size="small" className="text-ui-fg-subtle">
                {row.created_at ? formatDateTime(row.created_at) : "—"}
              </Text>
            ),
          },
        ]}
        rowActions={(row) => (
          <div className="flex items-center gap-x-2">
            {row.status === "pending_approval" && (
              <Button
                variant="primary"
                size="small"
                isLoading={approveMutation.isPending}
                onClick={() => approveMutation.mutate(row.id)}
              >
                Approve
              </Button>
            )}
            {row.status === "active" && (
              <Button
                variant="secondary"
                size="small"
                isLoading={suspendMutation.isPending}
                onClick={() => suspendMutation.mutate(row.id)}
              >
                Suspend
              </Button>
            )}
            {row.status === "suspended" && (
              <Button
                variant="primary"
                size="small"
                isLoading={approveMutation.isPending}
                onClick={() => approveMutation.mutate(row.id)}
              >
                Activate
              </Button>
            )}
          </div>
        )}
      />
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Vendors",
  icon: BuildingStorefront,
  rank: 15,
})

export default VendorsPage
