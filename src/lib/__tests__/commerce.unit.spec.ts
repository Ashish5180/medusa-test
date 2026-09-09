import {
  centsToAmount,
  isEventLine,
  isRentalFeeLine,
  kindFromVertical,
  PRODUCT_KIND,
  rentalDayCount,
  VERTICAL,
  verticalFromKind,
} from "../commerce"

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

  test("kindFromVertical maps catalog types", () => {
    expect(kindFromVertical(VERTICAL.RENTAL)).toBe(PRODUCT_KIND.RENTAL)
    expect(kindFromVertical(VERTICAL.APPOINTMENT)).toBe(PRODUCT_KIND.BOOKING)
    expect(kindFromVertical(VERTICAL.EVENT)).toBe(PRODUCT_KIND.EVENT)
    expect(kindFromVertical(VERTICAL.RETAIL)).toBe(PRODUCT_KIND.PHYSICAL)
    expect(verticalFromKind(PRODUCT_KIND.BOOKING)).toBe(VERTICAL.APPOINTMENT)
    expect(isEventLine({ vertical: VERTICAL.EVENT, type: "event" })).toBe(true)
  })
})
