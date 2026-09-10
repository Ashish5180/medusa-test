import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createOrderWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { fail, parseBody } from "../../../_helpers/http"

const createOrderSchema = z.object({
  email: z.string().email("A valid email is required"),
  item_title: z.string().min(1, "item_title is required"),
  quantity: z.coerce.number().int().positive().optional(),
  unit_price: z.coerce.number().positive().optional(),
  region_id: z.string().optional(),
  sales_channel_id: z.string().optional(),
  currency_code: z.string().optional(),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = parseBody(createOrderSchema, req.body, res)
  if (!body) {
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  try {
    let regionId = body.region_id
    let salesChannelId = body.sales_channel_id
    let currencyCode = body.currency_code

    if (!regionId || !currencyCode) {
      const { data: regions } = await query.graph({
        entity: "region",
        fields: ["id", "currency_code"],
      })
      regionId = regionId || regions[0]?.id
      currencyCode = currencyCode || regions[0]?.currency_code
    }

    if (!salesChannelId) {
      const { data: channels } = await query.graph({
        entity: "sales_channel",
        fields: ["id"],
      })
      salesChannelId = channels[0]?.id
    }

    if (!regionId) {
      res.status(400).json({ message: "No region found. Seed the store first." })
      return
    }

    const { result } = await createOrderWorkflow(req.scope).run({
      input: {
        email: body.email,
        region_id: regionId,
        sales_channel_id: salesChannelId,
        currency_code: currencyCode || "eur",
        status: "pending",
        items: [
          {
            title: body.item_title,
            quantity: body.quantity || 1,
            unit_price: body.unit_price || 10,
          },
        ],
      },
    })

    res.status(201).json({ success: true, order: result })
  } catch (err) {
    fail(res, err, "Failed to create order")
  }
}
