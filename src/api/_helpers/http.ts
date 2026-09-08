import type { MedusaResponse } from "@medusajs/framework/http"
import type { z } from "zod"

export function parseBody<T>(
  schema: z.ZodType<T>,
  body: unknown,
  res: MedusaResponse
): T | null {
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    res.status(400).json({
      message: parsed.error.issues[0]?.message || "Invalid request body",
    })
    return null
  }

  return parsed.data
}

export function fail(res: MedusaResponse, err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback
  res.status(400).json({ success: false, message })
}
