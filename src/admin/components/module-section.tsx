import { type FormEvent, type ReactNode, useState } from "react"
import { Button, Container, Heading, Input, Label, Select, Table, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../lib/sdk"

type Field = {
  name: string
  label: string
  type?: "text" | "number" | "datetime" | "email" | "select"
  required?: boolean
  step?: string
  options?: { label: string; value: string }[]
}

type Column<T> = {
  header: string
  cell: (row: T) => ReactNode
}

type ModuleSectionProps<T extends { id: string }> = {
  title: string
  hint: string
  queryKey: string[]
  listPath: string
  pick: (data: unknown) => T[]
  columns: Column<T>[]
  fields: Field[]
  createPath: string
  createLabel: string
  toCreate: (values: Record<string, string>) => unknown
  deletePath?: (row: T) => string
  emptyCreate?: Record<string, string>
  rowActions?: (row: T, helpers: { refresh: () => void }) => ReactNode
}

export function ModuleSection<T extends { id: string }>({
  title,
  hint,
  queryKey,
  listPath,
  pick,
  columns,
  fields,
  createPath,
  createLabel,
  toCreate,
  deletePath,
  emptyCreate,
  rowActions,
}: ModuleSectionProps<T>) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => sdk.client.fetch(listPath),
  })
  const rows = data ? pick(data) : []
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>(emptyCreate ?? {})

  const createMutation = useMutation({
    mutationFn: (body: unknown) =>
      sdk.client.fetch(createPath, { method: "POST", body }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey })
      toast.success(`${title} created`)
      setOpen(false)
      setValues(emptyCreate ?? {})
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (path: string) => sdk.client.fetch(path, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey })
      toast.success("Removed")
    },
    onError: (error: Error) => toast.error(error.message),
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    createMutation.mutate(toCreate(values))
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">{title}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {hint}
          </Text>
        </div>
        <Button size="small" onClick={() => setOpen((current) => !current)}>
          {open ? "Close" : createLabel}
        </Button>
      </div>

      {open ? (
        <form onSubmit={onSubmit} className="grid gap-4 px-6 py-4 md:grid-cols-2">
          {fields.map((field) => (
            <div key={field.name} className="flex flex-col gap-y-2">
              <Label>{field.label}</Label>
              {field.type === "select" ? (
                <Select
                  value={values[field.name] ?? ""}
                  onValueChange={(value) =>
                    setValues((current) => ({ ...current, [field.name]: value }))
                  }
                >
                  <Select.Trigger>
                    <Select.Value placeholder={`Select ${field.label.toLowerCase()}`} />
                  </Select.Trigger>
                  <Select.Content>
                    {(field.options ?? []).map((option) => (
                      <Select.Item key={option.value} value={option.value}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              ) : (
                <Input
                  required={field.required}
                  type={field.type === "datetime" ? "datetime-local" : field.type || "text"}
                  step={field.step}
                  value={values[field.name] ?? ""}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [field.name]: event.target.value,
                    }))
                  }
                />
              )}
            </div>
          ))}
          <div className="md:col-span-2">
            <Button type="submit" isLoading={createMutation.isPending}>
              Save
            </Button>
          </div>
        </form>
      ) : null}

      <div className="px-6 py-4">
        {isLoading ? (
          <Text size="small">Loading…</Text>
        ) : !rows.length ? (
          <Text size="small" className="text-ui-fg-subtle">
            No {title.toLowerCase()} yet.
          </Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                {columns.map((column) => (
                  <Table.HeaderCell key={column.header}>{column.header}</Table.HeaderCell>
                ))}
                {deletePath || rowActions ? <Table.HeaderCell>Actions</Table.HeaderCell> : null}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((row) => (
                <Table.Row key={row.id}>
                  {columns.map((column) => (
                    <Table.Cell key={column.header}>{column.cell(row)}</Table.Cell>
                  ))}
                  {deletePath || rowActions ? (
                    <Table.Cell>
                      <div className="flex flex-wrap items-center gap-1">
                        {rowActions
                          ? rowActions(row, {
                              refresh: () => {
                                void queryClient.invalidateQueries({ queryKey })
                              },
                            })
                          : null}
                        {deletePath ? (
                          <Button
                            variant="transparent"
                            size="small"
                            onClick={() => deleteMutation.mutate(deletePath(row))}
                          >
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </Table.Cell>
                  ) : null}
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>
    </Container>
  )
}
