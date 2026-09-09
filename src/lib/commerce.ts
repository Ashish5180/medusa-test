export const VERTICAL = {
  RETAIL: "retail",
  APPOINTMENT: "appointment",
  RENTAL: "rental",
  EVENT: "event",
} as const

export type Vertical = (typeof VERTICAL)[keyof typeof VERTICAL]

/** Catalog type stamped on product.metadata.type — official mixed-cart kinds. */
export const PRODUCT_KIND = {
  PHYSICAL: "physical",
  BOOKING: "booking",
  RENTAL: "rental",
  EVENT: "event",
} as const

export type ProductKind = (typeof PRODUCT_KIND)[keyof typeof PRODUCT_KIND]

export function kindFromVertical(vertical?: string | null): ProductKind {
  if (vertical === VERTICAL.RENTAL) return PRODUCT_KIND.RENTAL
  if (vertical === VERTICAL.APPOINTMENT) return PRODUCT_KIND.BOOKING
  if (vertical === VERTICAL.EVENT) return PRODUCT_KIND.EVENT
  return PRODUCT_KIND.PHYSICAL
}

export function verticalFromKind(kind?: string | null): Vertical {
  if (kind === PRODUCT_KIND.RENTAL) return VERTICAL.RENTAL
  if (kind === PRODUCT_KIND.BOOKING) return VERTICAL.APPOINTMENT
  if (kind === PRODUCT_KIND.EVENT) return VERTICAL.EVENT
  return VERTICAL.RETAIL
}

export const RENTAL_LINE_KIND = {
  FEE: "fee",
  DEPOSIT: "deposit",
} as const

export const DEFAULT_MAX_RENTAL_DAYS = 5
export const APPOINTMENT_FREE_CANCEL_HOURS = 24
export const STALE_CART_HOLD_HOURS = 2

export function centsToAmount(cents: number): number {
  return Number(cents) / 100
}

export function amountToCents(amount: number): number {
  return Math.round(Number(amount) * 100)
}

export function rentalDayCount(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime()
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

export function rentalHourCount(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime()
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)))
}

export function rentalPeriodCount(
  start: Date,
  end: Date,
  durationType: "hourly" | "daily" | string | null | undefined
) {
  return durationType === "hourly" ? rentalHourCount(start, end) : rentalDayCount(start, end)
}

export function isAppointmentLine(metadata?: Record<string, unknown> | null) {
  return metadata?.vertical === VERTICAL.APPOINTMENT
}

export function isRentalLine(metadata?: Record<string, unknown> | null) {
  return metadata?.vertical === VERTICAL.RENTAL
}

export function isRentalFeeLine(metadata?: Record<string, unknown> | null) {
  return isRentalLine(metadata) && metadata?.kind === RENTAL_LINE_KIND.FEE
}

export function isRentalDepositLine(metadata?: Record<string, unknown> | null) {
  return isRentalLine(metadata) && metadata?.kind === RENTAL_LINE_KIND.DEPOSIT
}

export function isEventLine(metadata?: Record<string, unknown> | null) {
  return metadata?.vertical === VERTICAL.EVENT
}

export function hoursUntil(date: Date): number {
  return (date.getTime() - Date.now()) / (1000 * 60 * 60)
}
