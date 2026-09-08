export function formatDateTime(value?: string | Date | null) {
  if (!value) {
    return "—"
  }
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) {
    return "—"
  }
  return date.toLocaleString()
}

export function formatMoney(amount?: number | null) {
  if (amount == null) {
    return "—"
  }
  return (amount / 100).toFixed(2)
}
