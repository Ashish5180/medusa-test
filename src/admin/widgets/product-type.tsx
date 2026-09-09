import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import { Button, Container, Heading, Select, Text, toast } from "@medusajs/ui"
import { useState } from "react"
import { sdk } from "../lib/sdk"

const KINDS = [
  { value: "physical", label: "Physical" },
  { value: "booking", label: "Booking" },
  { value: "rental", label: "Rental" },
  { value: "event", label: "Event" },
] as const

function kindFromProduct(product: HttpTypes.AdminProduct) {
  const type = product.metadata?.type
  if (type === "booking" || type === "rental" || type === "event" || type === "physical") {
    return type
  }
  const vertical = product.metadata?.vertical
  if (vertical === "appointment") return "booking"
  if (vertical === "rental") return "rental"
  if (vertical === "event") return "event"
  return "physical"
}

const ProductTypeWidget = ({ data }: DetailWidgetProps<HttpTypes.AdminProduct>) => {
  const [kind, setKind] = useState(kindFromProduct(data))
  const [saving, setSaving] = useState(false)
  const current = kindFromProduct(data)

  async function save() {
    setSaving(true)
    try {
      const vertical =
        kind === "booking" ? "appointment" : kind === "physical" ? "retail" : kind
      await sdk.admin.product.update(data.id, {
        metadata: {
          ...(data.metadata || {}),
          type: kind,
          vertical,
        },
      })
      toast.success(`Catalog type set to ${kind}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update type")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Catalog type</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          physical · booking · rental · event. Mixed carts use this to pick the checkout route.
        </Text>
      </div>
      <div className="flex flex-col gap-y-3 px-6 py-4">
        <Select value={kind} onValueChange={(value) => setKind(value as typeof kind)}>
          <Select.Trigger>
            <Select.Value placeholder="Type" />
          </Select.Trigger>
          <Select.Content>
            {KINDS.map((option) => (
              <Select.Item key={option.value} value={option.value}>
                {option.label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select>
        <Button
          size="small"
          variant="secondary"
          disabled={saving || kind === current}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save type"}
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.before",
})

export default ProductTypeWidget
