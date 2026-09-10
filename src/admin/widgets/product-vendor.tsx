import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import { Badge, Button, Container, Heading, Select, Text, toast } from "@medusajs/ui"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../lib/sdk"

type Vendor = {
  id: string
  name: string
  handle: string
  status?: string
}

const ProductVendorWidget = ({ data }: DetailWidgetProps<HttpTypes.AdminProduct>) => {
  const queryClient = useQueryClient()
  const initialVendorId = (data.metadata?.vendor_id as string) || ""
  const [selectedVendorId, setSelectedVendorId] = useState(initialVendorId)
  const [saving, setSaving] = useState(false)

  const { data: vendorsData, isLoading } = useQuery({
    queryKey: ["admin", "vendors"],
    queryFn: () => sdk.client.fetch<{ vendors: Vendor[] }>("/admin/vendors"),
  })

  const vendors = vendorsData?.vendors || []
  const currentVendor = vendors.find((v) => v.id === initialVendorId)

  async function save() {
    setSaving(true)
    try {
      await sdk.admin.product.update(data.id, {
        metadata: {
          ...(data.metadata || {}),
          vendor_id: selectedVendorId || null,
        },
      })
      toast.success("Product vendor assignment updated")
      queryClient.invalidateQueries({ queryKey: ["admin", "products", data.id] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update vendor")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Marketplace Vendor</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Assign this product to a marketplace vendor for multi-vendor order splitting and commission tracking.
          </Text>
        </div>
        {currentVendor ? (
          <Badge color="blue" size="small">
            {currentVendor.name}
          </Badge>
        ) : (
          <Badge color="grey" size="small">
            Platform (Default)
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-y-3 px-6 py-4">
        <Select
          disabled={isLoading}
          value={selectedVendorId}
          onValueChange={(val) => setSelectedVendorId(val)}
        >
          <Select.Trigger>
            <Select.Value placeholder={isLoading ? "Loading vendors..." : "Select a marketplace vendor"} />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="">
              Platform / In-House Store
            </Select.Item>
            {vendors.map((v) => (
              <Select.Item key={v.id} value={v.id}>
                {v.name} (@{v.handle}) {v.status === "active" ? "" : `(${v.status})`}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>

        <div className="flex justify-end">
          <Button
            size="small"
            isLoading={saving}
            disabled={selectedVendorId === initialVendorId}
            onClick={save}
          >
            Save Assignment
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductVendorWidget
