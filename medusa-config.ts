import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  admin: {
    // Official dashboard only. Do not put custom widgets in src/admin — that mixes
    // Medusa's UI with our seller panel. APIs stay on /admin; this UI is /app.
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true",
    path: "/app",
    backendUrl: process.env.MEDUSA_BACKEND_URL,
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    databaseDriverOptions: process.env.DATABASE_URL?.includes("neon.tech") || process.env.DATABASE_URL?.includes("sslmode=require")
      ? {
          connection: {
            ssl: { rejectUnauthorized: false },
          },
        }
      : undefined,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
  modules: [
    {
      resolve: "./src/modules/rental",
    },
    {
      resolve: "./src/modules/appointment",
    },
    {
      resolve: "./src/modules/event",
    },
    {
      resolve: "./src/modules/vendor",
    },
    ...(process.env.STRIPE_API_KEY
      ? [
          {
            resolve: "@medusajs/medusa/payment",
            options: {
              providers: [
                {
                  resolve: "@medusajs/medusa/payment-stripe",
                  id: "stripe",
                  options: {
                    apiKey: process.env.STRIPE_API_KEY,
                    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
                    capture: false,
                    automatic_payment_methods: true,
                  },
                },
              ],
            },
          },
        ]
      : []),
  ],
})
