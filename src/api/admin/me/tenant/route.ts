import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveTenant } from "../../../../lib/tenant"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const tenant = await resolveTenant(req)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "user",
    fields: ["id", "email", "first_name", "last_name"],
    filters: { id: tenant.userId },
  })

  const user = data[0] as
    | { id?: string; email?: string; first_name?: string; last_name?: string }
    | undefined

  res.json({
    user: {
      id: tenant.userId,
      email: user?.email,
      first_name: user?.first_name,
      last_name: user?.last_name,
    },
    role: tenant.role,
    is_platform: tenant.is_platform,
    vendor: tenant.vendor,
  })
}
