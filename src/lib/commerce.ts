export const VERTICAL = {
  RETAIL: "retail",
  APPOINTMENT: "appointment",
  RENTAL: "rental",
} as const

export type Vertical = (typeof VERTICAL)[keyof typeof VERTICAL]

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

export function hoursUntil(date: Date): number {
  return (date.getTime() - Date.now()) / (1000 * 60 * 60)
}
