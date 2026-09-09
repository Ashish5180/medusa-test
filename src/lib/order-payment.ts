import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  capturePaymentWorkflow,
  refundPaymentWorkflow,
} from "@medusajs/medusa/core-flows"

type OrderPayment = {
  id: string
  amount?: number
  captured_amount?: number
  canceled_at?: Date | string | null
}

async function listOrderPayments(
  container: MedusaContainer,
  orderId: string
): Promise<OrderPayment[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "payment_collections.id",
      "payment_collections.payments.id",
      "payment_collections.payments.amount",
      "payment_collections.payments.captured_amount",
      "payment_collections.payments.canceled_at",
    ],
    filters: { id: orderId },
  })

  const collections =
    (data[0] as {
      payment_collections?: Array<{ payments?: OrderPayment[] }>
    })?.payment_collections || []

  return collections.flatMap((collection) => collection.payments || [])
}

export async function getActiveOrderPayment(
  container: MedusaContainer,
  orderId: string
): Promise<OrderPayment | null> {
  const payments = await listOrderPayments(container, orderId)
  return (
    payments.find((payment) => !payment.canceled_at) ||
    payments[0] ||
    null
  )
}

export async function orderHasCapturedPayment(
  container: MedusaContainer,
  orderId: string
): Promise<boolean> {
  const payments = await listOrderPayments(container, orderId)
  return payments.some((payment) => Number(payment.captured_amount || 0) > 0)
}

export async function captureOrderAmount(
  container: MedusaContainer,
  orderId: string,
  amount: number
): Promise<{ skipped: boolean; reason?: string }> {
  if (amount <= 0) {
    return { skipped: true, reason: "zero_amount" }
  }

  const payment = await getActiveOrderPayment(container, orderId)
  if (!payment) {
    return { skipped: true, reason: "no_payment" }
  }

  try {
    await capturePaymentWorkflow(container).run({
      input: {
        payment_id: payment.id,
        amount,
      },
    })
    return { skipped: false }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { skipped: true, reason: `capture_unavailable: ${message}` }
  }
}

export async function refundOrderAmount(
  container: MedusaContainer,
  orderId: string,
  amount: number,
  note?: string
): Promise<{ skipped: boolean; reason?: string }> {
  if (amount <= 0) {
    return { skipped: true, reason: "zero_amount" }
  }

  const payment = await getActiveOrderPayment(container, orderId)
  if (!payment) {
    return { skipped: true, reason: "no_payment" }
  }

  const captured = Number(payment.captured_amount || 0)
  if (captured <= 0) {
    return { skipped: true, reason: "nothing_captured" }
  }

  await refundPaymentWorkflow(container).run({
    input: {
      payment_id: payment.id,
      amount: Math.min(amount, captured),
      note,
    },
  })

  return { skipped: false }
}

export async function voidOrderPayment(
  container: MedusaContainer,
  orderId: string
): Promise<{ skipped: boolean; reason?: string }> {
  const payment = await getActiveOrderPayment(container, orderId)
  if (!payment) {
    return { skipped: true, reason: "no_payment" }
  }

  if (Number(payment.captured_amount || 0) > 0) {
    return { skipped: true, reason: "already_captured" }
  }

  const paymentModule = container.resolve(Modules.PAYMENT) as {
    cancelPayment: (id: string) => Promise<unknown>
  }
  await paymentModule.cancelPayment(payment.id)
  return { skipped: false }
}
