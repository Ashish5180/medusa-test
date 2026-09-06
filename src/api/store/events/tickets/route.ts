import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import issueEventTicketWorkflow, {
  IssueEventTicketInput,
} from "../../../../workflows/events/issue-event-ticket"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.body as IssueEventTicketInput

  if (!body.eventId) {
    res.status(400).json({
      message: "eventId is required.",
    })
    return
  }

  try {
    const { result } = await issueEventTicketWorkflow(req.scope).run({
      input: body,
    })

    res.status(201).json({
      success: true,
      ticket: result,
    })
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message || "Failed to issue event ticket",
    })
  }
}
