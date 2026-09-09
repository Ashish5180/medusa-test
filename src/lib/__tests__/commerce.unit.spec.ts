import { centsToAmount, rentalDayCount, VERTICAL, isRentalFeeLine } from "../commerce"

describe("commerce helpers", () => {
  test("centsToAmount converts stored cents to Medusa major units", () => {
    expect(centsToAmount(7500)).toBe(75)
    expect(centsToAmount(150)).toBe(1.5)
  })

  test("rentalDayCount is at least one day", () => {
    expect(
      rentalDayCount(new Date("2026-10-01T10:00:00Z"), new Date("2026-10-01T18:00:00Z"))
    ).toBe(1)
    expect(
      rentalDayCount(new Date("2026-10-01T10:00:00Z"), new Date("2026-10-04T10:00:00Z"))
    ).toBe(3)
  })

  test("isRentalFeeLine reads line metadata", () => {
    expect(
      isRentalFeeLine({ vertical: VERTICAL.RENTAL, kind: "fee" })
    ).toBe(true)
    expect(
      isRentalFeeLine({ vertical: VERTICAL.RENTAL, kind: "deposit" })
    ).toBe(false)
  })
})
