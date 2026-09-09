import type { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

type RentalNotice = {
  to?: string | null
  event:
    | "rental.return_reminder"
    | "rental.overdue"
    | "rental.returned"
    | "rental.rented_out"
  subject: string
  body: string
  data?: Record<string, unknown>
}

/**
 * Sends through Medusa's Notification module when a provider (Resend / SendGrid)
 * is configured. Always logs so the demo still shows the event without email.
 */
export async function notifyRental(container: MedusaContainer, notice: RentalNotice) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  logger.info(`[rental.notify] ${notice.event} → ${notice.to || "unaddressed"}: ${notice.subject}`)

  if (!notice.to) {
    return
  }

  try {
    const notification = container.resolve(Modules.NOTIFICATION) as {
      createNotifications: (input: unknown) => Promise<unknown>
    }
    await notification.createNotifications({
      to: notice.to,
      channel: "email",
      template: notice.event,
      data: {
        subject: notice.subject,
        body: notice.body,
        ...(notice.data ?? {}),
      },
    })
  } catch (err) {
    logger.warn(
      `[rental.notify] Notification module skipped (${
        err instanceof Error ? err.message : String(err)
      })`
    )
  }
}

export async function orderEmail(
  container: MedusaContainer,
  orderId?: string | null
): Promise<string | null> {
  if (!orderId) {
    return null
  }
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "email"],
    filters: { id: orderId },
  })
  return ((data[0] as { email?: string } | undefined)?.email as string) || null
}
