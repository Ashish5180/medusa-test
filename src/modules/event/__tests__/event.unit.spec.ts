import EventModuleService from "../service"

describe("EventModuleService Unit Tests", () => {
  let service: EventModuleService

  beforeEach(() => {
    service = new EventModuleService({} as any)
  })

  test("getEventRemainingCapacity calculates remaining seats and sold-out status", async () => {
    jest.spyOn(service, "retrieveEvent").mockResolvedValue({
      id: "ev_1",
      title: "Tech Summit",
      total_capacity: 100,
      tickets_issued: 85,
    } as any)

    const cap = await service.getEventRemainingCapacity("ev_1")

    expect(cap.totalCapacity).toBe(100)
    expect(cap.ticketsIssued).toBe(85)
    expect(cap.remainingCapacity).toBe(15)
    expect(cap.isSoldOut).toBe(false)
  })

  test("issueTicket throws if event is sold out", async () => {
    jest.spyOn(service, "retrieveEvent").mockResolvedValue({
      id: "ev_2",
      title: "VIP Gala",
      total_capacity: 50,
      tickets_issued: 50,
    } as any)

    await expect(
      service.issueTicket("ev_2", { attendee_name: "Karan Patel" })
    ).rejects.toThrow("already sold out")
  })

  test("issueTicket generates unique ticket code and increments issued count", async () => {
    jest.spyOn(service, "retrieveEvent").mockResolvedValue({
      id: "ev_100",
      title: "AI Workshop",
      total_capacity: 100,
      tickets_issued: 10,
      status: "published",
    } as any)

    const createTicketSpy = jest
      .spyOn(service, "createEventTickets")
      .mockImplementation(async (data: any) => ({
        id: "tck_1",
        ...data,
      }))

    const updateEventSpy = jest
      .spyOn(service, "updateEvents")
      .mockResolvedValue({} as any)

    const ticket = await service.issueTicket("ev_100", {
      ticket_tier: "VIP Pass",
      attendee_name: "Karan Patel",
      attendee_email: "karan@example.com",
    })

    expect(ticket.ticket_code).toMatch(/^TCK-[A-Za-z0-9_]{4}-[A-F0-9]{8}$/)
    expect(ticket.ticket_tier).toBe("VIP Pass")
    expect(updateEventSpy).toHaveBeenCalledWith({
      id: "ev_100",
      tickets_issued: 11,
      status: "published",
    })
  })

  test("validateTicketCheckin prevents duplicate check-ins", async () => {
    jest.spyOn(service, "listEventTickets").mockResolvedValue([
      {
        id: "tck_2",
        ticket_code: "TCK-VALID-1234",
        status: "valid",
        is_checked_in: true,
        checked_in_at: new Date("2026-09-04T10:00:00Z"),
      } as any,
    ])

    const result = await service.validateTicketCheckin("TCK-VALID-1234")

    expect(result.success).toBe(false)
    expect(result.alreadyCheckedIn).toBe(true)
    expect(result.message).toContain("already been scanned")
  })

  test("validateTicketCheckin marks fresh ticket as used and checked-in", async () => {
    jest.spyOn(service, "listEventTickets").mockResolvedValue([
      {
        id: "tck_3",
        ticket_code: "TCK-FRESH-5678",
        status: "valid",
        is_checked_in: false,
        checked_in_at: null,
      } as any,
    ])

    const updateSpy = jest
      .spyOn(service, "updateEventTickets")
      .mockResolvedValue({
        id: "tck_3",
        is_checked_in: true,
        status: "used",
      } as any)

    const result = await service.validateTicketCheckin("TCK-FRESH-5678")

    expect(result.success).toBe(true)
    expect(result.alreadyCheckedIn).toBe(false)
    expect(updateSpy).toHaveBeenCalled()
  })
})
