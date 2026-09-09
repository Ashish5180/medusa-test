import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Tag } from "@medusajs/icons"
import { Badge, Container, Heading, Table, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { sdk } from "../../lib/sdk"

type AdminProduct = {
  id: string
  title?: string
  handle?: string
  status?: string
  metadata?: { type?: string; vertical?: string } | null
}

function catalogType(product: AdminProduct) {
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

function tone(type: string): "green" | "blue" | "orange" | "grey" {
  if (type === "booking") return "blue"
  if (type === "rental") return "orange"
  if (type === "event") return "green"
  return "grey"
}

const CatalogTypesPage = () => {
  const { data } = useQuery({
    queryKey: ["admin", "catalog-types"],
    queryFn: () =>
      sdk.client.fetch<{ products?: AdminProduct[] }>(
        "/admin/products?limit=100&fields=id,title,handle,status,metadata"
      ),
  })
  const products = data?.products ?? []
  const counts = products.reduce(
    (acc, product) => {
      const type = catalogType(product)
      acc[type] = (acc[type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <Container className="flex flex-col gap-y-4 p-0">
      <div className="px-6 py-4">
        <Heading>Catalog types</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Every product is physical, booking, rental, or event. One cart can hold all four.
          Open a product to change its type; booking, rental, and event widgets appear on
          the matching detail pages.
        </Text>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["physical", "booking", "rental", "event"] as const).map((type) => (
            <Badge key={type} size="2xsmall" color={tone(type)}>
              {type} · {counts[type] || 0}
            </Badge>
          ))}
        </div>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Product</Table.HeaderCell>
            <Table.HeaderCell>Type</Table.HeaderCell>
            <Table.HeaderCell>Handle</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {products.map((product) => {
            const type = catalogType(product)
            return (
              <Table.Row key={product.id}>
                <Table.Cell>{product.title || product.id}</Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall" color={tone(type)}>
                    {type}
                  </Badge>
                </Table.Cell>
                <Table.Cell>{product.handle || "—"}</Table.Cell>
                <Table.Cell>{product.status || "—"}</Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Catalog types",
  icon: Tag,
  rank: 15,
})

export default CatalogTypesPage
