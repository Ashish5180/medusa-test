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

function messageFromUnknown(err: unknown): string | undefined {
  if (err instanceof Error && err.message) {
    return err.message
  }

  if (typeof err === "object" && err) {
    const record = err as {
      message?: unknown
      errors?: Array<{ error?: { message?: unknown } | Error; message?: unknown }>
    }

    const nested = record.errors?.[0]
    const nestedError = nested?.error
    if (nestedError instanceof Error && nestedError.message) {
      return nestedError.message
    }
    if (
      nestedError &&
      typeof nestedError === "object" &&
      "message" in nestedError &&
      nestedError.message
    ) {
      return String(nestedError.message)
    }
    if (nested?.message) {
      return String(nested.message)
    }
    if (record.message) {
      return String(record.message)
    }
  }

  return undefined
}

export function fail(res: MedusaResponse, err: unknown, fallback: string) {
  res.status(400).json({
    success: false,
    message: messageFromUnknown(err) || fallback,
  })
}
