import RentalModuleService from "../service"

describe("RentalModuleService Unit Tests", () => {
  let service: RentalModuleService

  beforeEach(() => {
    service = new RentalModuleService({} as any)
  })

  test("calculateQuote calculates days, daily rate, and security deposit correctly", async () => {
    // Mock retrieveRentalItem
    jest.spyOn(service, "retrieveRentalItem").mockResolvedValue({
      id: "rent_camera_1",
      daily_rate: 75,
      deposit_amount: 300,
      min_rental_days: 1,
      max_rental_days: 5,
    } as any)

    const start = new Date("2026-10-01T10:00:00Z")
    const end = new Date("2026-10-04T10:00:00Z") // 3 days

    const quote = await service.calculateQuote("rent_camera_1", start, end)

    expect(quote.days).toBe(3)
    expect(quote.dailyRate).toBe(75)
    expect(quote.rentalFee).toBe(225) // 3 * 75
    expect(quote.depositAmount).toBe(300)
    expect(quote.totalDueAtCheckout).toBe(525) // 225 + 300
  })

  test("calculateQuote rejects rentals longer than max_rental_days", async () => {
    jest.spyOn(service, "retrieveRentalItem").mockResolvedValue({
      id: "rent_camera_1",
      daily_rate: 75,
      deposit_amount: 300,
      min_rental_days: 1,
      max_rental_days: 5,
    } as any)

    await expect(
      service.calculateQuote(
        "rent_camera_1",
        new Date("2026-10-01T10:00:00Z"),
        new Date("2026-10-10T10:00:00Z")
      )
    ).rejects.toThrow("capped at 5")
  })

  test("processReturnInspection refunds full deposit if no damage", async () => {
    jest.spyOn(service, "retrieveRentalBooking").mockResolvedValue({
      id: "bk_123",
      deposit_amount: 300,
    } as any)

    jest.spyOn(service, "updateRentalBookings").mockResolvedValue({
      id: "bk_123",
      rental_status: "returned",
      deposit_status: "refunded",
    } as any)

    const result = await service.processReturnInspection("bk_123", "Pristine condition", 0)

    expect(result.depositRefundable).toBe(300)
    expect(result.damageFeeDeducted).toBe(0)
  })

  test("processReturnInspection deducts damage fee from deposit", async () => {
    jest.spyOn(service, "retrieveRentalBooking").mockResolvedValue({
      id: "bk_124",
      deposit_amount: 300,
    } as any)

    jest.spyOn(service, "updateRentalBookings").mockResolvedValue({
      id: "bk_124",
      rental_status: "returned",
      deposit_status: "partially_refunded",
    } as any)

    const result = await service.processReturnInspection("bk_124", "Scratched lens filter", 100)

    expect(result.depositRefundable).toBe(200)
    expect(result.damageFeeDeducted).toBe(100)
  })
})
