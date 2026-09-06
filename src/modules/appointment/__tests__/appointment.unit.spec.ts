import AppointmentModuleService from "../service"
import { MedusaError } from "@medusajs/framework/utils"

describe("AppointmentModuleService Unit Tests", () => {
  let service: AppointmentModuleService

  beforeEach(() => {
    service = new AppointmentModuleService({} as any)
  })

  test("reserveSlot throws error if slot is blocked", async () => {
    jest.spyOn(service, "retrieveServiceSlot").mockResolvedValue({
      id: "slot_1",
      is_blocked: true,
      max_capacity: 1,
      booked_count: 0,
    } as any)

    await expect(
      service.reserveSlot("slot_1", { customer_name: "Rahul Verma" })
    ).rejects.toThrow("This slot is blocked and unavailable.")
  })

  test("reserveSlot throws error if slot is already fully booked", async () => {
    jest.spyOn(service, "retrieveServiceSlot").mockResolvedValue({
      id: "slot_2",
      is_blocked: false,
      max_capacity: 2,
      booked_count: 2,
    } as any)

    await expect(
      service.reserveSlot("slot_2", { customer_name: "Rahul Verma" })
    ).rejects.toThrow("This appointment slot is already fully booked.")
  })

  test("reserveSlot successfully books slot and updates booked_count", async () => {
    jest.spyOn(service, "retrieveServiceSlot").mockResolvedValue({
      id: "slot_3",
      is_blocked: false,
      max_capacity: 2,
      booked_count: 1,
    } as any)

    const createSpy = jest
      .spyOn(service, "createAppointmentBookings")
      .mockResolvedValue({
        id: "app_1",
        slot_id: "slot_3",
        status: "confirmed",
      } as any)

    const updateSlotSpy = jest
      .spyOn(service, "updateServiceSlots")
      .mockResolvedValue({} as any)

    const booking = await service.reserveSlot("slot_3", {
      customer_name: "Anita Roy",
      customer_email: "anita@example.com",
    })

    expect(booking.id).toBe("app_1")
    expect(createSpy).toHaveBeenCalled()
    expect(updateSlotSpy).toHaveBeenCalledWith({
      id: "slot_3",
      booked_count: 2,
    })
  })
})
